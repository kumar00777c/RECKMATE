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

        this.white = null; // { id, username, rating: 1000, connected: true, disconnectedAt: null }
        this.black = null; // { id, username, rating: 1000, connected: true, disconnectedAt: null }

        this.chess = new Chess();
        this.status = "waiting"; // "waiting", "active", "completed"
        this.winner = null; // "white", "black", "draw"
        this.termination = null; // "checkmate", "resignation", "timeout", "abandonment", "draw_agreement"

        this.whiteTime = this.initialSeconds;
        this.blackTime = this.initialSeconds;
        this.lastMoveTimestamp = null;
        this.clockInterval = null;

        this.drawOfferedBy = null; // "white" or "black"
        this.clients = new Map(); // res -> userId
        this.createdAt = Date.now();
        this.endedAt = null;
        this.disconnectLimitSeconds = 60; // 1 minute disconnect forfeit limit
        this.disconnectTimer = null;
    }

    addPlayer(user, preferredColor = "random") {
        const rating = user.rating || 1000;
        if (this.white && this.white.id === user.id) {
            this.white.username = user.username;
            this.white.rating = rating;
            this.handlePlayerReconnect("white");
            return "white";
        }
        if (this.black && this.black.id === user.id) {
            this.black.username = user.username;
            this.black.rating = rating;
            this.handlePlayerReconnect("black");
            return "black";
        }

        if (!this.white && !this.black) {
            const assignWhite = preferredColor === "white" ? true
                              : preferredColor === "black" ? false
                              : Math.random() < 0.5;
            if (assignWhite) {
                this.white = { id: user.id, username: user.username, rating, connected: true, disconnectedAt: null };
                return "white";
            } else {
                this.black = { id: user.id, username: user.username, rating, connected: true, disconnectedAt: null };
                return "black";
            }
        }

        if (!this.white) {
            this.white = { id: user.id, username: user.username, rating, connected: true, disconnectedAt: null };
            this.startGame();
            return "white";
        }

        if (!this.black) {
            this.black = { id: user.id, username: user.username, rating, connected: true, disconnectedAt: null };
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

            // 1. Live game clock check
            let whiteRemaining = this.whiteTime;
            let blackRemaining = this.blackTime;

            if (this.chess.turn() === "w") {
                whiteRemaining = Math.max(0, this.whiteTime - elapsed);
                if (whiteRemaining <= 0) {
                    this.whiteTime = 0;
                    this.endGame("black", "timeout");
                    return;
                }
            } else {
                blackRemaining = Math.max(0, this.blackTime - elapsed);
                if (blackRemaining <= 0) {
                    this.blackTime = 0;
                    this.endGame("white", "timeout");
                    return;
                }
            }

            // 2. Disconnect 1-minute grace countdown check (Rule: >1 min disconnected = forfeit)
            if (this.white && !this.white.connected && this.white.disconnectedAt) {
                const dcSecs = Math.floor((now - this.white.disconnectedAt) / 1000);
                if (dcSecs >= this.disconnectLimitSeconds) {
                    this.endGame("black", "abandonment");
                    return;
                }
            }

            if (this.black && !this.black.connected && this.black.disconnectedAt) {
                const dcSecs = Math.floor((now - this.black.disconnectedAt) / 1000);
                if (dcSecs >= this.disconnectLimitSeconds) {
                    this.endGame("white", "abandonment");
                    return;
                }
            }

            // Broadcast periodic clock tick (every second) so clients stay 100% in sync
            this.broadcast({
                type: "clock_tick",
                whiteTime: Math.round(whiteRemaining),
                blackTime: Math.round(blackRemaining),
                turn: this.chess.turn(),
                whiteDisconnectedSecs: this.white && !this.white.connected && this.white.disconnectedAt ? Math.max(0, this.disconnectLimitSeconds - Math.floor((now - this.white.disconnectedAt) / 1000)) : null,
                blackDisconnectedSecs: this.black && !this.black.connected && this.black.disconnectedAt ? Math.max(0, this.disconnectLimitSeconds - Math.floor((now - this.black.disconnectedAt) / 1000)) : null
            });
        }, 1000);
    }

    handlePlayerDisconnect(userId) {
        if (this.status !== "active") return;
        const now = Date.now();
        if (this.white && this.white.id === userId && this.white.connected) {
            this.white.connected = false;
            this.white.disconnectedAt = now;
            this.broadcast({
                type: "player_disconnected",
                color: "white",
                graceSeconds: this.disconnectLimitSeconds,
                state: this.getState()
            });
        }
        if (this.black && this.black.id === userId && this.black.connected) {
            this.black.connected = false;
            this.black.disconnectedAt = now;
            this.broadcast({
                type: "player_disconnected",
                color: "black",
                graceSeconds: this.disconnectLimitSeconds,
                state: this.getState()
            });
        }
    }

    handlePlayerReconnect(color) {
        if (color === "white" && this.white) {
            this.white.connected = true;
            this.white.disconnectedAt = null;
        }
        if (color === "black" && this.black) {
            this.black.connected = true;
            this.black.disconnectedAt = null;
        }
        if (this.status === "active") {
            this.broadcast({
                type: "player_reconnected",
                color: color,
                state: this.getState()
            });
        }
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

    async endGame(winner, termination) {
        if (this.status === "completed") return;
        this.status = "completed";
        this.winner = winner;
        this.termination = termination;
        this.endedAt = Date.now();

        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }

        let ratingData = null;
        if (this.onGameEnd) {
            try {
                ratingData = await this.onGameEnd(this);
            } catch (err) {
                console.error("Error in onGameEnd:", err);
            }
        }

        if (ratingData) {
            if (this.white && ratingData.white) {
                this.white.rating = ratingData.white.newRating;
            }
            if (this.black && ratingData.black) {
                this.black.rating = ratingData.black.newRating;
            }
        }

        this.broadcast({
            type: "game_over",
            winner: this.winner,
            termination: this.termination,
            state: this.getState(),
            ratingData: ratingData
        });
    }

    addClient(res, userId) {
        this.clients.set(res, userId);

        if (this.white && this.white.id === userId) {
            this.handlePlayerReconnect("white");
        } else if (this.black && this.black.id === userId) {
            this.handlePlayerReconnect("black");
        }

        res.on("close", () => {
            const uid = this.clients.get(res);
            this.clients.delete(res);

            // Check if user has no other open tabs/connections to this room
            let stillConnected = false;
            for (const otherUid of this.clients.values()) {
                if (otherUid === uid) {
                    stillConnected = true;
                    break;
                }
            }
            if (!stillConnected && uid) {
                this.handlePlayerDisconnect(uid);
            }
        });

        // Send immediate initial sync
        res.write(`data: ${JSON.stringify({ type: "sync", state: this.getState() })}\n\n`);
    }

    broadcast(data) {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const client of this.clients.keys()) {
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
            drawOfferedBy: this.drawOfferedBy,
            endedAt: this.endedAt
        };
    }
}

class MultiplayerManager {
    constructor(supabaseAdmin) {
        this.supabaseAdmin = supabaseAdmin;
        this.rooms = new Map(); // roomId -> GameRoom
        this.roomsByCode = new Map(); // roomCode -> roomId
        this.dismissedGamesByUser = new Map(); // userId -> Set of roomIds
    }

    createRoom(user, options = {}) {
        const id = "game_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
        const room = new GameRoom(id, options);

        room.onGameEnd = async (finishedRoom) => {
            return await this.persistGame(finishedRoom);
        };

        const color = room.addPlayer(user, options.preferredColor || "random");
        this.rooms.set(id, room);
        this.roomsByCode.set(room.code, id);

        return { room, color };
    }

    findOrCreateMatch(user, timeControl = "10+0") {
        // 1. Look for an existing open room waiting for an opponent with the same time control
        for (const room of this.rooms.values()) {
            if (
                room.status === "waiting" &&
                !room.isPrivate &&
                room.timeControl === timeControl &&
                (!room.white || room.white.id !== user.id) &&
                (!room.black || room.black.id !== user.id)
            ) {
                // Match found! Join this room
                const color = room.addPlayer(user);
                return { room, color, matched: true };
            }
        }

        // 2. Check if this user is already waiting in a queue room for this time control
        for (const room of this.rooms.values()) {
            if (
                room.status === "waiting" &&
                !room.isPrivate &&
                room.timeControl === timeControl &&
                ((room.white && room.white.id === user.id) || (room.black && room.black.id === user.id))
            ) {
                const color = room.white && room.white.id === user.id ? "white" : "black";
                return { room, color, matched: false };
            }
        }

        // 3. Create a new room in the queue
        const { room, color } = this.createRoom(user, {
            timeControl,
            isPrivate: false,
            preferredColor: "random"
        });

        return { room, color, matched: false };
    }

    cancelMatchmaking(user, roomId) {
        const room = this.rooms.get(roomId);
        if (room && room.status === "waiting") {
            if ((room.white && room.white.id === user.id) || (room.black && room.black.id === user.id)) {
                room.status = "cancelled";
                this.rooms.delete(roomId);
                this.roomsByCode.delete(room.code);
                return true;
            }
        }
        return false;
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

    dismissGame(userId, roomId) {
        if (!this.dismissedGamesByUser.has(userId)) {
            this.dismissedGamesByUser.set(userId, new Set());
        }
        this.dismissedGamesByUser.get(userId).add(roomId);
    }

    isGameDismissed(userId, roomId) {
        return this.dismissedGamesByUser.has(userId) && this.dismissedGamesByUser.get(userId).has(roomId);
    }

    findActiveMatchForUser(userId) {
        // 1. Look for active ongoing game
        for (const room of this.rooms.values()) {
            if (room.status === "active" && ((room.white && room.white.id === userId) || (room.black && room.black.id === userId))) {
                const color = room.white && room.white.id === userId ? "white" : "black";
                return { room, color, isCompleted: false };
            }
        }

        // 2. Look for recently completed game (within 10 minutes) that user hasn't dismissed yet
        const now = Date.now();
        for (const room of this.rooms.values()) {
            if (room.status === "completed" && !this.isGameDismissed(userId, room.id) && ((room.white && room.white.id === userId) || (room.black && room.black.id === userId))) {
                if (room.endedAt && (now - room.endedAt) < 10 * 60 * 1000) {
                    const color = room.white && room.white.id === userId ? "white" : "black";
                    return { room, color, isCompleted: true };
                }
            }
        }

        return null;
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
                return await this.updatePlayerRatings(room.white.id, room.black.id, room.winner);
            }
        } catch (err) {
            console.error("Game persist exception:", err);
        }
        return null;
    }

    async updatePlayerRatings(whiteId, blackId, winner) {
        try {
            // Fetch current ratings
            const { data: profiles, error } = await this.supabaseAdmin
                .from("Profiles")
                .select("id, rating")
                .in("id", [whiteId, blackId]);

            if (error || !profiles || profiles.length < 2) return null;

            const whiteProfile = profiles.find(p => p.id === whiteId);
            const blackProfile = profiles.find(p => p.id === blackId);

            if (!whiteProfile || !blackProfile) return null;

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

            return {
                white: { id: whiteId, oldRating: rw, newRating: newWhiteRating, diff: newWhiteRating - rw },
                black: { id: blackId, oldRating: rb, newRating: newBlackRating, diff: newBlackRating - rb }
            };
        } catch (err) {
            console.error("Error updating player ratings:", err);
            return null;
        }
    }
}

module.exports = { MultiplayerManager };
