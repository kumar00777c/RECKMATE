const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const path = require("path");
const { MultiplayerManager } = require("./multiplayer");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));
function getCookie(req, name) {
    const cookies = req.headers.cookie;

    if (!cookies) return null;

    const parts = cookies.split(";");

    for (const part of parts) {
        const [key, ...valueParts] = part.trim().split("=");

        if (key === name) {
            return decodeURIComponent(valueParts.join("="));
        }
    }

    return null;
}

function setCookie(res, name, value, maxAge) {
    const isProduction = process.env.NODE_ENV === "production";

    const cookie =
        `${name}=${encodeURIComponent(value)}; ` +
        `HttpOnly; ` +
        `Path=/; ` +
        `Max-Age=${maxAge}; ` +
        `SameSite=Lax; ` +
        `${isProduction ? "Secure; " : ""}`;

    res.append("Set-Cookie", cookie);
}

function clearCookie(res, name) {
    const isProduction = process.env.NODE_ENV === "production";

    const cookie =
        `${name}=; ` +
        `HttpOnly; ` +
        `Path=/; ` +
        `Max-Age=0; ` +
        `SameSite=Lax; ` +
        `${isProduction ? "Secure; " : ""}`;

    res.append("Set-Cookie", cookie);
}
function createSupabaseClient() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        }
    );
}

function createSupabaseAdminClient() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        }
    );
}

const PORT = process.env.PORT || 3000;

const resend = new Resend(
    process.env.RESEND_API_KEY
);

app.get("/api/status", (req, res) => {
    res.json({
        project: "RECKMATE",
        version: "V2",
        status: "online"
    });
});

app.post("/api/login", async (req, res) => {
    const supabase = createSupabaseClient();
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            status: "error",
            message: "Username and password are required."
        });
    }

    // Find the RECKMATE profile
    const { data: profile, error: profileError } = await supabase
        .from("Profiles")
        .select("id, registration_no, username, full_name, role, rating, must_change_password")
        .eq("username", username)
        .single();

    if (profileError || !profile) {
        return res.status(401).json({
            status: "error",
            message: "Invalid username or password."
        });
    }

    // Internal authentication email
    const internalEmail =
        `${profile.registration_no.toLowerCase()}@accounts.reckmate.local`;

    // Authenticate with Supabase
    const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
            email: internalEmail,
            password: password
        });

    if (authError) {
        return res.status(401).json({
            status: "error",
            message: "Invalid username or password."
        });
    }

    setCookie(
    res,
    "reck_access_token",
    authData.session.access_token,
    authData.session.expires_in
);

setCookie(
    res,
    "reck_refresh_token",
    authData.session.refresh_token,
    60 * 60 * 24 * 30
);

res.json({
    status: "success",
    message: "Login successful!",
    user: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        role: profile.role,
        rating: profile.rating,
        must_change_password: profile.must_change_password
    }
 });
});
app.get("/api/session", async (req, res) => {
    const supabase = createSupabaseClient();
    const accessToken = getCookie(req, "reck_access_token");
    const refreshToken = getCookie(req, "reck_refresh_token");

    if (!accessToken && !refreshToken) {
        return res.status(401).json({
            status: "error",
            message: "Not authenticated."
        });
    }

    let userId = null;

    // First try the existing access token
    if (accessToken) {

        const { data, error } =
            await supabase.auth.getUser(accessToken);

        if (!error && data.user) {
            userId = data.user.id;
        }
    }

    // If the access token is expired/invalid,
    // use the refresh token to create a new session.
    if (!userId && refreshToken) {

        const { data, error } =
            await supabase.auth.refreshSession({
                refresh_token: refreshToken
            });

        if (error || !data.session || !data.user) {

            clearCookie(res, "reck_access_token");
            clearCookie(res, "reck_refresh_token");

            return res.status(401).json({
                status: "error",
                message: "Session expired."
            });
        }

        userId = data.user.id;

        // Supabase may rotate the tokens.
        // Always replace the old cookies with the new ones.
        setCookie(
            res,
            "reck_access_token",
            data.session.access_token,
            data.session.expires_in
        );

        setCookie(
            res,
            "reck_refresh_token",
            data.session.refresh_token,
            60 * 60 * 24 * 30
        );
    }

    if (!userId) {
        return res.status(401).json({
            status: "error",
            message: "Not authenticated."
        });
    }

    // Get the RECKMATE profile belonging to the authenticated user.
    const { data: profile, error: profileError } =
        await supabase
            .from("Profiles")
            .select(
                "id, registration_no, username, full_name, role, rating, must_change_password"
            )
            .eq("id", userId)
            .single();

    if (profileError || !profile) {
        return res.status(401).json({
            status: "error",
            message: "Profile not found."
        });
    }

    res.json({
        status: "success",
        user: {
            id: profile.id,
            username: profile.username,
            full_name: profile.full_name,
            role: profile.role,
            rating: profile.rating,
            must_change_password: profile.must_change_password
        }
    });
});

// ============================================================
// STUDENT PROFILE — CHANGE PASSWORD
// ============================================================

app.patch("/api/profile/password", async (req, res) => {

    const supabase = createSupabaseClient();

    const accessToken = getCookie(req, "reck_access_token");
    const refreshToken = getCookie(req, "reck_refresh_token");

    if (!accessToken && !refreshToken) {
        return res.status(401).json({
            status: "error",
            message: "Not authenticated."
        });
    }

    let userId = null;

    // Try current access token
    if (accessToken) {

        const { data, error } =
            await supabase.auth.getUser(accessToken);

        if (!error && data.user) {
            userId = data.user.id;
        }
    }

    // Refresh if necessary
    if (!userId && refreshToken) {

        const { data, error } =
            await supabase.auth.refreshSession({
                refresh_token: refreshToken
            });

        if (error || !data.session || !data.user) {

            clearCookie(res, "reck_access_token");
            clearCookie(res, "reck_refresh_token");

            return res.status(401).json({
                status: "error",
                message: "Session expired."
            });
        }

        userId = data.user.id;

        // Store rotated tokens
        setCookie(
            res,
            "reck_access_token",
            data.session.access_token,
            data.session.expires_in
        );

        setCookie(
            res,
            "reck_refresh_token",
            data.session.refresh_token,
            60 * 60 * 24 * 30
        );
    }

    if (!userId) {
        return res.status(401).json({
            status: "error",
            message: "Not authenticated."
        });
    }

    // Get the authenticated user's profile
    const {
        data: profile,
        error: profileError
    } = await supabase
        .from("Profiles")
        .select("id, registration_no, username, full_name, role")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
        return res.status(404).json({
            status: "error",
            message: "Profile not found."
        });
    }

    const {
        current_password,
        new_password
    } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({
            status: "error",
            message: "Current password and new password are required."
        });
    }

    if (new_password.length < 8) {
        return res.status(400).json({
            status: "error",
            message: "New password must be at least 8 characters long."
        });
    }

    if (current_password === new_password) {
        return res.status(400).json({
            status: "error",
            message: "New password must be different from the current password."
        });
    }

    // Re-authenticate the student using the current password.
    // This prevents someone with an active browser session
    // from changing the password without knowing the old one.
    const internalEmail =
        `${profile.registration_no.toLowerCase()}@accounts.reckmate.local`;

    const {
        error: passwordCheckError
    } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: current_password
    });

    if (passwordCheckError) {
        return res.status(401).json({
            status: "error",
            message: "Current password is incorrect."
        });
    }
    const supabaseAdmin = createSupabaseAdminClient();

    // Change the password for THIS authenticated user only.
    const {
        data: updatedUser,
        error: updateError
    } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
            password: new_password
        }
    );

    if (updateError || !updatedUser) {

        console.error(
            "Password update failed:",
            updateError
        );

        return res.status(500).json({
            status: "error",
            message: "Unable to update password."
        });
    }

    // If the account was created by an admin and had
    // must_change_password enabled, mark it as completed.
   // Clear the forced password-change flag

const {
    data: updatedProfile,
    error: flagError
} = await supabaseAdmin
    .from("Profiles")
    .update({
        must_change_password: false
    })
    .eq("id", profile.id)
    .select("id, username, must_change_password")
    .maybeSingle();

if (flagError) {
    console.error(
        "Could not update password-change flag:",
        flagError
    );

    return res.status(500).json({
        status: "error",
        message:
            "Password changed, but the account status could not be updated."
    });
}

if (!updatedProfile) {
    console.error(
        "PASSWORD FLAG UPDATE MATCHED ZERO ROWS.",
        "profile.id =",
        profile.id
    );

    return res.status(500).json({
        status: "error",
        message:
            "Password changed, but the account status could not be updated."
    });
}


res.json({
    status: "success",
    message: "Password changed successfully."
});
});

app.get("/api/admin/session", async (req, res) => {

    const supabase = createSupabaseClient();

    const accessToken = getCookie(req, "reck_access_token");
    const refreshToken = getCookie(req, "reck_refresh_token");

    if (!accessToken && !refreshToken) {
        return res.status(401).json({
            status: "error",
            message: "Not authenticated."
        });
    }

    let userId = null;

    // Try the current access token first
    if (accessToken) {

        const { data, error } =
            await supabase.auth.getUser(accessToken);

        if (!error && data.user) {
            userId = data.user.id;
        }
    }

    // If necessary, refresh the session
    if (!userId && refreshToken) {

        const { data, error } =
            await supabase.auth.refreshSession({
                refresh_token: refreshToken
            });

        if (error || !data.session || !data.user) {

            clearCookie(res, "reck_access_token");
            clearCookie(res, "reck_refresh_token");

            return res.status(401).json({
                status: "error",
                message: "Session expired."
            });
        }

        userId = data.user.id;

        setCookie(
            res,
            "reck_access_token",
            data.session.access_token,
            data.session.expires_in
        );

        setCookie(
            res,
            "reck_refresh_token",
            data.session.refresh_token,
            60 * 60 * 24 * 30
        );
    }

    if (!userId) {
        return res.status(401).json({
            status: "error",
            message: "Not authenticated."
        });
    }

    // Get the authenticated user's profile
    const { data: profile, error: profileError } =
        await supabase
            .from("Profiles")
            .select(
                "id, registration_no, username, full_name, role, rating, must_change_password"
            )
            .eq("id", userId)
            .single();

    if (profileError || !profile) {
        return res.status(401).json({
            status: "error",
            message: "Profile not found."
        });
    }

    // Server-side authorization check
    if (profile.role !== "admin") {
        return res.status(403).json({
            status: "error",
            message: "Admin access required."
        });
    }

    res.json({
        status: "success",
        admin: true,
        user: {
            id: profile.id,
            registration_no: profile.registration_no,
            username: profile.username,
            full_name: profile.full_name,
            role: profile.role,
            rating: profile.rating
        }
    });
});

app.post("/api/admin/students", async (req, res) => {

    const supabase = createSupabaseClient();

    const accessToken = getCookie(req, "reck_access_token");
    const refreshToken = getCookie(req, "reck_refresh_token");

    if (!accessToken && !refreshToken) {
        return res.status(401).json({
            status: "error",
            message: "Not authenticated."
        });
    }

    let userId = null;

    // Check current access token
    if (accessToken) {

        const { data, error } =
            await supabase.auth.getUser(accessToken);

        if (!error && data.user) {
            userId = data.user.id;
        }
    }

    // Refresh session if necessary
    if (!userId && refreshToken) {

        const { data, error } =
            await supabase.auth.refreshSession({
                refresh_token: refreshToken
            });

        if (error || !data.session || !data.user) {

            clearCookie(res, "reck_access_token");
            clearCookie(res, "reck_refresh_token");

            return res.status(401).json({
                status: "error",
                message: "Session expired."
            });
        }

        userId = data.user.id;

        setCookie(
            res,
            "reck_access_token",
            data.session.access_token,
            data.session.expires_in
        );

        setCookie(
            res,
            "reck_refresh_token",
            data.session.refresh_token,
            60 * 60 * 24 * 30
        );
    }

    if (!userId) {
        return res.status(401).json({
            status: "error",
            message: "Not authenticated."
        });
    }

    // Verify that the requester is an admin
    const { data: adminProfile, error: adminError } =
        await supabase
            .from("Profiles")
            .select("id, role")
            .eq("id", userId)
            .single();

    if (adminError || !adminProfile) {
        return res.status(403).json({
            status: "error",
            message: "Profile not found."
        });
    }

    if (adminProfile.role !== "admin") {
        return res.status(403).json({
            status: "error",
            message: "Admin access required."
        });
    }

    // Get student information
    const {
        full_name,
        registration_no,
        username,
        recovery_email,
        password
    } = req.body;

    if (
        !full_name ||
        !registration_no ||
        !username ||
        !recovery_email ||
        !password
    ) {
        return res.status(400).json({
            status: "error",
            message:
                "Full name, registration number, username and password are required."
        });
    }

    const cleanFullName = String(full_name).trim();
    const cleanRegistrationNo = String(registration_no).trim();
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanRecoveryEmail = String(recovery_email).trim().toLowerCase();

    if (
        !cleanFullName ||
        !cleanRegistrationNo ||
        !cleanUsername ||
        !password
    ) {
        return res.status(400).json({
            status: "error",
            message: "All required fields must contain valid values."
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            status: "error",
            message: "Password must be at least 8 characters long."
        });
    }

    // Check duplicate registration number
    const { data: existingRegistration } =
        await supabase
            .from("Profiles")
            .select("id")
            .eq("registration_no", cleanRegistrationNo)
            .maybeSingle();

    if (existingRegistration) {
        return res.status(409).json({
            status: "error",
            message: "Registration number already exists."
        });
    }

    // Check duplicate username
    const { data: existingUsername } =
        await supabase
            .from("Profiles")
            .select("id")
            .eq("username", cleanUsername)
            .maybeSingle();

    if (existingUsername) {
        return res.status(409).json({
            status: "error",
            message: "Username already exists."
        });
    }

    // Internal Supabase authentication email
    const internalEmail =
        `${cleanRegistrationNo.toLowerCase()}@accounts.reckmate.local`;

    // Create Supabase Auth account
    const {
        data: authData,
        error: authError
    } = await supabase.auth.admin.createUser({
        email: internalEmail,
        password: password,
        email_confirm: true
    });

    if (authError || !authData.user) {

        console.error(
            "Student Auth creation failed:",
            authError
        );

        return res.status(500).json({
            status: "error",
            message:
                "Unable to create student authentication account."
        });
    }

    // Create RECKMATE profile
    const {
        data: profile,
        error: profileError
    } = await supabase
        .from("Profiles")
        .insert({
            id: authData.user.id,
            registration_no: cleanRegistrationNo,
            username: cleanUsername,
            full_name: cleanFullName,
            recovery_email: cleanRecoveryEmail,
            role: "player",
            must_change_password: true,
            rating: 1000
        })
        .select(
            "id, registration_no, username, full_name, role, rating"
        )
        .single();

    // Roll back Auth account if profile creation fails
    if (profileError || !profile) {

        console.error(
            "Student profile creation failed:",
            profileError
        );

        await supabase.auth.admin.deleteUser(
            authData.user.id
        );

        return res.status(500).json({
            status: "error",
            message:
                "Unable to create student profile."
        });
    }

    res.status(201).json({
        status: "success",
        message: "Student account created successfully.",
        student: profile
    });
});

// ============================================================
// PASSWORD RECOVERY
// ============================================================

app.post("/api/forgot-password", async (req, res) => {

    const supabase = createSupabaseAdminClient();

    const { username } = req.body;

    if (!username) {
        return res.status(400).json({
            status: "error",
            message: "Username is required."
        });
    }

    const cleanUsername =
        String(username).trim().toLowerCase();

    try {

        // Find the RECKMATE profile
        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("Profiles")
            .select(
                "id, registration_no, username, recovery_email"
            )
            .eq("username", cleanUsername)
            .maybeSingle();

        /*
         * IMPORTANT:
         * Do not reveal whether a username exists.
         * This prevents account enumeration.
         */
        if (
            profileError ||
            !profile ||
            !profile.recovery_email
        ) {

            return res.json({
                status: "success",
                message:
                    "If an account exists with that username, a recovery link has been sent."
            });

        }

        // The actual Supabase Auth email is internal.
        const internalEmail =
            `${profile.registration_no.toLowerCase()}@accounts.reckmate.local`;

        // Determine the public URL of the application
        const baseUrl =
            process.env.APP_URL ||
            (req.get("origin") && !req.get("origin").includes("localhost") ? req.get("origin") : null) ||
            (req.headers["x-forwarded-host"]
                ? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"]}`
                : null) ||
            "https://reckmate.onrender.com";

        // Generate the secure Supabase recovery link.
        const {
            data: linkData,
            error: linkError
        } = await supabase.auth.admin.generateLink({
            type: "recovery",
            email: internalEmail,
            options: {
                redirectTo: `${baseUrl}/#reset-password`
            }
        });

        if (linkError || !linkData?.properties) {

            console.error(
                "Recovery link generation failed:",
                linkError
            );

            return res.status(500).json({
                status: "error",
                message:
                    "Unable to generate recovery link."
            });
        }

        // Send the student directly to the website reset page with the secure token,
        // so they never get bounced back to localhost or fail Supabase redirect whitelist
        const recoveryToken = linkData.properties.hashed_token || linkData.properties.email_otp;
        const recoveryLink = `${baseUrl}/#reset-password?token=${recoveryToken}&type=recovery`;

        // Send the recovery link to the student's
        // registered recovery email.
        const { data: emailData, error: emailError } =
            await resend.emails.send({

                from:
                    "RECKMATE <onboarding@resend.dev>",

                to: [profile.recovery_email],

                subject:
                    "RECKMATE Password Recovery",

                html: `
                    <div style="
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: auto;
                        padding: 30px;
                        background: #111;
                        color: #fff;
                    ">

                        <h1>
                            RECK<span style="color:#d4af37">
                            MATE
                            </span>
                        </h1>

                        <h2>
                            Password Recovery
                        </h2>

                        <p>
                            We received a request to reset
                            your RECKMATE password.
                        </p>

                        <p>
                            Click the button below to choose
                            a new password.
                        </p>

                        <p>
                            <a
                                href="${recoveryLink}"
                                style="
                                    display:inline-block;
                                    padding:12px 20px;
                                    background:#d4af37;
                                    color:#111;
                                    text-decoration:none;
                                    border-radius:6px;
                                    font-weight:bold;
                                "
                            >
                                Reset Password
                            </a>
                        </p>

                        <p>
                            If you did not request this,
                            you can safely ignore this email.
                        </p>

                        <p style="color:#999;">
                            This is an automated RECKMATE
                            security email.
                        </p>

                    </div>
                `
            });

        if (emailError) {

            console.error(
                "Recovery email failed:",
                emailError
            );

            return res.status(500).json({
                status: "error",
                message:
                    "Unable to send recovery email."
            });
        }

        console.log(
            "PASSWORD RECOVERY EMAIL SENT:",
            cleanUsername,
            profile.recovery_email
        );

        return res.json({
            status: "success",
            message:
                "If an account exists with that username, a recovery link has been sent."
        });

    } catch (error) {

        console.error(
            "Password recovery error:",
            error
        );

        return res.status(500).json({
            status: "error",
            message:
                "Unable to process password recovery."
        });
    }
});

// ============================================================
// RESET PASSWORD (USING RECOVERY TOKEN / SESSION)
// ============================================================

app.post("/api/reset-password", async (req, res) => {
    try {
        const { token, token_hash, access_token, new_password } = req.body;

        if (!new_password) {
            return res.status(400).json({
                status: "error",
                message: "New password is required."
            });
        }

        if (typeof new_password !== "string" || new_password.length < 8) {
            return res.status(400).json({
                status: "error",
                message: "Password must be at least 8 characters long."
            });
        }

        const supabaseAdmin = createSupabaseAdminClient();
        let userId = null;

        // Path 1: token or token_hash supplied (OTP verification via admin client)
        const otpToken = token_hash || token;
        if (otpToken) {
            const { data: verifyData, error: verifyError } =
                await supabaseAdmin.auth.verifyOtp({
                    token_hash: otpToken,
                    type: "recovery"
                });

            if (verifyError || !verifyData?.user) {
                console.error("Recovery OTP verification error:", verifyError);
                return res.status(400).json({
                    status: "error",
                    message: "Invalid or expired recovery link. Please request a new one."
                });
            }

            userId = verifyData.user.id;
        } else if (access_token) {
            // Path 2: access_token from recovery redirect hash
            const supabase = createSupabaseClient();
            const { data: userData, error: userError } =
                await supabase.auth.getUser(access_token);

            if (userError || !userData?.user) {
                console.error("Recovery access token error:", userError);
                return res.status(400).json({
                    status: "error",
                    message: "Invalid or expired recovery session. Please request a new link."
                });
            }

            userId = userData.user.id;
        } else {
            return res.status(400).json({
                status: "error",
                message: "Recovery token is missing."
            });
        }

        // Update the user's password securely via Supabase Admin API
        const { data: updatedUser, error: updateError } =
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: new_password
            });

        if (updateError || !updatedUser) {
            console.error("Password reset updateUserById error:", updateError);
            return res.status(500).json({
                status: "error",
                message: "Unable to reset password. Please try again."
            });
        }

        // Clear must_change_password flag if it was set
        await supabaseAdmin
            .from("Profiles")
            .update({
                must_change_password: false
            })
            .eq("id", userId);

        // Clear any existing cookies to ensure clean login
        clearCookie(res, "reck_access_token");
        clearCookie(res, "reck_refresh_token");

        return res.json({
            status: "success",
            message: "Password has been reset successfully. You can now log in."
        });

    } catch (error) {
        console.error("Reset password unexpected error:", error);
        return res.status(500).json({
            status: "error",
            message: "Unable to process password reset."
        });
    }
});

app.post("/api/logout", async (req, res) => {

    const supabase = createSupabaseClient();

    const accessToken = getCookie(req, "reck_access_token");

    try {

        if (accessToken) {
            await supabase.auth.admin.signOut(
                accessToken,
                "local"
            );
        }

    } catch (error) {
        console.error("Logout error:", error);
    }

    clearCookie(res, "reck_access_token");
    clearCookie(res, "reck_refresh_token");

    res.json({
        status: "success",
        message: "Logged out successfully."
    });
});

// ============================================================
// MULTIPLAYER CHESS (SSE + HTTP POST)
// ============================================================

const multiplayerManager = new MultiplayerManager(createSupabaseAdminClient());

// Helper to authenticate user for multiplayer endpoints
async function getAuthenticatedUser(req, res) {
    const supabase = createSupabaseClient();
    const accessToken = getCookie(req, "reck_access_token");
    const refreshToken = getCookie(req, "reck_refresh_token");

    if (!accessToken && !refreshToken) {
        return null;
    }

    let userId = null;
    if (accessToken) {
        const { data, error } = await supabase.auth.getUser(accessToken);
        if (!error && data?.user) {
            userId = data.user.id;
        }
    }

    if (!userId && refreshToken) {
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
        });
        if (!error && data?.session && data?.user) {
            userId = data.user.id;
            setCookie(res, "reck_access_token", data.session.access_token, data.session.expires_in);
            setCookie(res, "reck_refresh_token", data.session.refresh_token, 60 * 60 * 24 * 30);
        }
    }

    if (!userId) return null;

    const { data: profile } = await supabase
        .from("Profiles")
        .select("id, username, full_name, rating")
        .eq("id", userId)
        .single();

    return profile;
}

// 1. Get open games list
app.get("/api/multiplayer/open", (req, res) => {
    res.json({
        status: "success",
        games: multiplayerManager.getOpenRooms()
    });
});

// 2. Create a multiplayer room
app.post("/api/multiplayer/create", async (req, res) => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) {
        return res.status(401).json({ status: "error", message: "Not authenticated." });
    }

    const { time_control, is_private, preferred_color } = req.body;
    const { room, color } = multiplayerManager.createRoom(user, {
        timeControl: time_control || "10+0",
        isPrivate: !!is_private,
        preferredColor: preferred_color || "random"
    });

    res.json({
        status: "success",
        room: room.getState(),
        assignedColor: color
    });
});

// 3. Join an existing room by ID or 6-digit Code
app.post("/api/multiplayer/join", async (req, res) => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) {
        return res.status(401).json({ status: "error", message: "Not authenticated." });
    }

    const { room_id_or_code } = req.body;
    if (!room_id_or_code) {
        return res.status(400).json({ status: "error", message: "Room ID or code is required." });
    }

    const result = multiplayerManager.joinRoom(user, room_id_or_code);
    if (result.error) {
        return res.status(400).json({ status: "error", message: result.error });
    }

    res.json({
        status: "success",
        room: result.room.getState(),
        assignedColor: result.color
    });
});

// 4. SSE Stream for Real-time Game Events
app.get("/api/multiplayer/game/:id/stream", async (req, res) => {
    const roomId = req.params.id;
    const room = multiplayerManager.getRoom(roomId);

    if (!room) {
        return res.status(404).json({ status: "error", message: "Game not found." });
    }

    // Set headers for Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for NGINX/Cloudflare
    res.flushHeaders?.();

    // Keep connection alive with periodic pings
    const pingInterval = setInterval(() => {
        try {
            res.write(": ping\n\n");
        } catch (e) {
            clearInterval(pingInterval);
        }
    }, 15000);

    req.on("close", () => {
        clearInterval(pingInterval);
    });

    room.addClient(res);
});

// 5. Submit Move
app.post("/api/multiplayer/game/:id/move", async (req, res) => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) {
        return res.status(401).json({ status: "error", message: "Not authenticated." });
    }

    const room = multiplayerManager.getRoom(req.params.id);
    if (!room) {
        return res.status(404).json({ status: "error", message: "Game not found." });
    }

    const { from, to, promotion } = req.body;
    const result = room.makeMove(user.id, { from, to, promotion: promotion || "q" });

    if (!result.success) {
        return res.status(400).json({ status: "error", message: result.message });
    }

    res.json({ status: "success", move: result.move, state: result.state });
});

// 6. Game Actions (Resign, Draw offer/accept/decline)
app.post("/api/multiplayer/game/:id/action", async (req, res) => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) {
        return res.status(401).json({ status: "error", message: "Not authenticated." });
    }

    const room = multiplayerManager.getRoom(req.params.id);
    if (!room) {
        return res.status(404).json({ status: "error", message: "Game not found." });
    }

    const { action } = req.body; // "resign", "offer_draw", "accept_draw", "decline_draw"
    const result = room.handleAction(user.id, action);

    if (!result.success) {
        return res.status(400).json({ status: "error", message: result.message });
    }

    res.json({ status: "success" });
});

// 7. Matchmaking: Find or Create Queue Match
app.post("/api/multiplayer/matchmake", async (req, res) => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) {
        return res.status(401).json({ status: "error", message: "Not authenticated." });
    }

    const { time_control } = req.body;
    const { room, color, matched } = multiplayerManager.findOrCreateMatch(user, time_control || "10+0");

    res.json({
        status: "success",
        room: room.getState(),
        assignedColor: color,
        matched: matched
    });
});

// 8. Cancel Matchmaking Queue
app.post("/api/multiplayer/cancel-queue", async (req, res) => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) {
        return res.status(401).json({ status: "error", message: "Not authenticated." });
    }

    const { room_id } = req.body;
    const cancelled = multiplayerManager.cancelMatchmaking(user, room_id);
    res.json({ status: "success", cancelled });
});

// 9. Live Leaderboard Endpoint (Top rated students from database)
app.get("/api/leaderboard", async (req, res) => {
    try {
        const supabase = createSupabaseAdminClient();
        const { data: players, error } = await supabase
            .from("Profiles")
            .select("id, username, full_name, rating, role")
            .order("rating", { ascending: false })
            .limit(100);

        if (error) {
            console.error("Leaderboard fetch error:", error);
            return res.status(500).json({ status: "error", message: "Failed to fetch leaderboard." });
        }

        return res.json({
            status: "success",
            players: players || []
        });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "Error loading leaderboard." });
    }
});

// 8. Player Match History
app.get("/api/matches", async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req, res);
        if (!user) {
            return res.status(401).json({ status: "error", message: "Not authenticated." });
        }

        const supabase = createSupabaseClient();
        const { data: games, error } = await supabase
            .from("Games")
            .select("*")
            .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
            .order("ended_at", { ascending: false })
            .limit(20);

        if (error) {
            return res.json({ status: "success", games: [] });
        }

        return res.json({ status: "success", games: games || [] });
    } catch (err) {
        return res.json({ status: "success", games: [] });
    }
});

app.listen(PORT, () => {
    console.log(`RECKMATE server running on port ${PORT}`);
});