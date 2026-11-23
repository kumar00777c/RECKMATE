const { Chess } = require("chess.js");

class GameRoom {
    constructor(id, options = {}) {
        this.id = id;
        this.code = options.code || id.slice(0, 6).toUpperCase();
        this.timeControl = options.timeControl || "10+0"; // e.g. "10+0", "5+3", "3+2"
        this.isPrivate = !!options.isPrivate;

        // Parse initial clock seconds & increment
        const [mins, inc] = this.timeControl.split("+").map(Number);
        this.initialSeconds = (mins || 10) * 60;
        this.increment = inc || 0;

        this.white = null; // { id, username, connected: true }
        this.black = null; // { id, username, connected: true }

        this.chess = new Chess();
        this.status = "waiting"; // "waiting", "active", "completed"
        this.winner = null; // "white", "black", "draw"
        this.termination = null; // "checkmate", "resignation", "timeout", "draw_agreement"

        this.whiteTime = this.initialSeconds;
        this.blackTime = this.initialSeconds;
        this.lastMoveTimestamp = null;
        this.clockInterval = null;

        this.drawOfferedBy = null; // "white" or "black"
        this.clients = new Set(); // SSE response connections
        this.createdAt = Date.now();
    }

    addPlayer(user, preferredColor = "random") {
        if (this.white && this.white.id === user.id) {
            this.white.username = user.username;
            return "white";
        }
        if (this.black && this.black.id === user.id) {
            this.black.username = user.username;
            return "black";
        }

        if (!this.white && !this.black) {
            const assignWhite = preferredColor === "white" ? true
                              : preferredColor === "black" ? false
                              : Math.random() < 0.5;
            if (assignWhite) {
                this.white = { id: user.id, username: user.username, connected: true };
                return "white";
            } else {
                this.black = { id: user.id, username: user.username, connected: true };
                return "black";
            }
        }

        if (!this.white) {
            this.white = { id: user.id, username: user.username, connected: true };
            this.startGame();
            return "white";
        }

        if (!this.black) {
            this.black = { id: user.id, username: user.username, connected: true };
            this.startGame();
            return "black";
        }

        return null; // Spectator or room full
    }

    startGame() {
        if (this.status !== "waiting") return;
        this.status = "active";
        this.lastMoveTimestamp = Date.now();
        this.startClock();
        this.broadcast({
            type: "game_started",
            state: this.getState()
        });
    }

    startClock() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.clockInterval = setInterval(() => {
            if (this.status !== "active") {
                clearInterval(this.clockInterval);
                return;
            }

            const now = Date.now();
            const elapsed = Math.floor((now - this.lastMoveTimestamp) / 1000);

            if (this.chess.turn() === "w") {
                const currentWhiteTime = Math.max(0, this.whiteTime - elapsed);
                if (currentWhiteTime <= 0) {
                    this.endGame("black", "timeout");
                }
            } else {
                const currentBlackTime = Math.max(0, this.blackTime - elapsed);
                if (currentBlackTime <= 0) {
                    this.endGame("white", "timeout");
                }
            }
        }, 1000);
    }

    makeMove(userId, move) {
        if (this.status !== "active") {
            return { success: false, message: "Game is not active." };
        }

        const turn = this.chess.turn();
        const playerColor = this.white && this.white.id === userId ? "w"
                          : this.black && this.black.id === userId ? "b"
                          : null;

        if (!playerColor) {
            return { success: false, message: "You are not a player in this game." };
        }

        if (turn !== playerColor) {
            return { success: false, message: "It is not your turn." };
        }

        // Deduct clock time for current player
        const now = Date.now();
        const elapsed = (now - this.lastMoveTimestamp) / 1000;
        if (playerColor === "w") {
            this.whiteTime = Math.max(0, this.whiteTime - elapsed + this.increment);
        } else {
            this.blackTime = Math.max(0, this.blackTime - elapsed + this.increment);
        }
        this.lastMoveTimestamp = now;

        // Clear any pending draw offer on move
        this.drawOfferedBy = null;

        // Execute legal move
        const executedMove = this.chess.move(move);
        if (!executedMove) {
            return { success: false, message: "Illegal move." };
        }

        // Check for game end
        if (this.chess.in_checkmate()) {
            this.endGame(playerColor === "w" ? "white" : "black", "checkmate");
        } else if (this.chess.in_draw() || this.chess.in_stalemate() || this.chess.in_threefold_repetition() || this.chess.insufficient_material()) {
            this.endGame("draw", "rules_draw");
        } else {
            this.broadcast({
                type: "move_made",
                move: executedMove,
                state: this.getState()
            });
        }

        return { success: true, move: executedMove, state: this.getState() };
    }

    handleAction(userId, action) {
        if (this.status !== "active") {
            return { success: false, message: "Game is not active." };
        }

        const playerColor = this.white && this.white.id === userId ? "white"
                          : this.black && this.black.id === userId ? "black"
                          : null;

        if (!playerColor) {
            return { success: false, message: "Not a player." };
        }

        if (action === "resign") {
            this.endGame(playerColor === "white" ? "black" : "white", "resignation");
            return { success: true };
        }

        if (action === "offer_draw") {
            this.drawOfferedBy = playerColor;
            this.broadcast({
                type: "draw_offered",
                by: playerColor
            });
            return { success: true };
        }

        if (action === "accept_draw") {
            if (this.drawOfferedBy && this.drawOfferedBy !== playerColor) {
                this.endGame("draw", "draw_agreement");
                return { success: true };
            }
            return { success: false, message: "No active draw offer from opponent." };
        }

        if (action === "decline_draw") {
            this.drawOfferedBy = null;
            this.broadcast({
                type: "draw_declined",
                by: playerColor
            });
            return { success: true };
        }

        return { success: false, message: "Unknown action." };
    }

    endGame(winner, termination) {
        if (this.status === "completed") return;
        this.status = "completed";
        this.winner = winner;
        this.termination = termination;

        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }

        this.broadcast({
            type: "game_over",
            winner: this.winner,
            termination: this.termination,
            state: this.getState()
        });

        if (this.onGameEnd) {
            this.onGameEnd(this);
        }
    }

    addClient(res) {
        this.clients.add(res);
        res.on("close", () => {
            this.clients.delete(res);
        });

        // Send immediate initial sync
        res.write(`data: ${JSON.stringify({ type: "sync", state: this.getState() })}\n\n`);
    }

    broadcast(data) {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const client of this.clients) {
            try {
                client.write(payload);
            } catch (err) {
                this.clients.delete(client);
            }
        }
    }

    getState() {
        let whiteRemaining = this.whiteTime;
        let blackRemaining = this.blackTime;

        if (this.status === "active" && this.lastMoveTimestamp) {
            const elapsed = (Date.now() - this.lastMoveTimestamp) / 1000;
            if (this.chess.turn() === "w") {
                whiteRemaining = Math.max(0, this.whiteTime - elapsed);
            } else {
                blackRemaining = Math.max(0, this.blackTime - elapsed);
            }
        }

        return {
            id: this.id,
            code: this.code,
            timeControl: this.timeControl,
            status: this.status,
            white: this.white,
            black: this.black,
            turn: this.chess.turn(),
            fen: this.chess.fen(),
            pgn: this.chess.pgn(),
            inCheck: this.chess.in_check(),
            whiteTime: Math.round(whiteRemaining),
            blackTime: Math.round(blackRemaining),
            winner: this.winner,
            termination: this.termination,
            drawOfferedBy: this.drawOfferedBy
        };
    }
}

class MultiplayerManager {
    constructor(supabaseAdmin) {
        this.supabaseAdmin = supabaseAdmin;
        this.rooms = new Map(); // roomId -> GameRoom
        this.roomsByCode = new Map(); // roomCode -> roomId
    }

    createRoom(user, options = {}) {
        const id = "game_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
        const room = new GameRoom(id, options);

        room.onGameEnd = (finishedRoom) => {
            this.persistGame(finishedRoom);
        };

        const color = room.addPlayer(user, options.preferredColor || "random");
        this.rooms.set(id, room);
        this.roomsByCode.set(room.code, id);

        return { room, color };
    }

    joinRoom(user, roomIdOrCode) {
        let id = roomIdOrCode;
        if (this.roomsByCode.has(roomIdOrCode.toUpperCase())) {
            id = this.roomsByCode.get(roomIdOrCode.toUpperCase());
        }

        const room = this.rooms.get(id);
        if (!room) {
            return { error: "Game not found." };
        }

        if (room.status === "completed") {
            return { error: "This game is already completed." };
        }

        const color = room.addPlayer(user);
        return { room, color };
    }

    getOpenRooms() {
        const list = [];
        for (const room of this.rooms.values()) {
            if (room.status === "waiting" && !room.isPrivate) {
                list.push({
                    id: room.id,
                    code: room.code,
                    timeControl: room.timeControl,
                    host: room.white ? room.white.username : room.black.username,
                    createdAt: room.createdAt
                });
            }
        }
        return list;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    async persistGame(room) {
        try {
            if (!this.supabaseAdmin) return;
            const state = room.getState();

            // 1. Save game into Supabase Games table if it exists
            const { error } = await this.supabaseAdmin
                .from("Games")
                .insert({
                    white_player_id: room.white ? room.white.id : null,
                    black_player_id: room.black ? room.black.id : null,
                    white_username: room.white ? room.white.username : "Anonymous",
                    black_username: room.black ? room.black.username : "Anonymous",
                    time_control: room.timeControl,
                    winner: room.winner,
                    termination: room.termination,
                    pgn: state.pgn,
                    fen: state.fen,
                    ended_at: new Date().toISOString()
                });

            if (error) {
                console.warn("Games table persist notice:", error.message);
            }

            // 2. Automated Elo Rating Calculation
            if (room.white?.id && room.black?.id && room.winner) {
                await this.updatePlayerRatings(room.white.id, room.black.id, room.winner);
            }
        } catch (err) {
            console.error("Game persist exception:", err);
        }
    }

    async updatePlayerRatings(whiteId, blackId, winner) {
        try {
            // Fetch current ratings
            const { data: profiles, error } = await this.supabaseAdmin
                .from("Profiles")
                .select("id, rating")
                .in("id", [whiteId, blackId]);

            if (error || !profiles || profiles.length < 2) return;

            const whiteProfile = profiles.find(p => p.id === whiteId);
            const blackProfile = profiles.find(p => p.id === blackId);

            if (!whiteProfile || !blackProfile) return;

            const rw = whiteProfile.rating || 1000;
            const rb = blackProfile.rating || 1000;

            // Elo formula with K-factor = 16
            // Equal win: +8 / -8
            // Upset win: ~+12 to +14 / -12 to -14
            // Expected win: ~+4 / -4
            // Draw between equals: 0
            // Draw against higher: ~+4 / -4
            const K = 16;
            const expectedW = 1 / (1 + Math.pow(10, (rb - rw) / 400));
            const expectedB = 1 / (1 + Math.pow(10, (rw - rb) / 400));

            const actualW = winner === "white" ? 1 : winner === "black" ? 0 : 0.5;
            const actualB = winner === "black" ? 1 : winner === "white" ? 0 : 0.5;

            const newWhiteRating = Math.max(100, Math.round(rw + K * (actualW - expectedW)));
            const newBlackRating = Math.max(100, Math.round(rb + K * (actualB - expectedB)));

            // Update both player profiles
            await Promise.all([
                this.supabaseAdmin.from("Profiles").update({ rating: newWhiteRating }).eq("id", whiteId),
                this.supabaseAdmin.from("Profiles").update({ rating: newBlackRating }).eq("id", blackId)
            ]);

            console.log(`[ELO UPDATED] White (${whiteId}): ${rw} -> ${newWhiteRating} | Black (${blackId}): ${rb} -> ${newBlackRating}`);
        } catch (err) {
            console.error("Error updating player ratings:", err);
        }
    }
}

module.exports = { MultiplayerManager };
