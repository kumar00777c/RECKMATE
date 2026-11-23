require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
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

async function finishAdmin() {
    const registrationNo = "ADMIN001";
    const fullName = "Kumar Soumya Ranjan";
    const username = "kumar";

    const internalEmail =
        `${registrationNo.toLowerCase()}@accounts.reckmate.local`;

    const { data, error } =
        await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000
        });

    if (error) {
        console.error("Could not retrieve users:", error.message);
        return;
    }

    const user = data.users.find(
        user => user.email === internalEmail
    );

    if (!user) {
        console.error("Admin Auth user was not found.");
        return;
    }

    const { error: profileError } = await supabase
        .from("Profiles")
        .insert({
            id: user.id,
            registration_no: registrationNo,
            full_name: fullName,
            username: username,
            role: "admin",
            must_change_password: false,
            rating: 1000
        });

    if (profileError) {
        console.error(
            "Profile creation failed:",
            profileError.message
        );
        return;
    }

    console.log("================================");
    console.log("ADMIN PROFILE CREATED SUCCESSFULLY");
    console.log("Username:", username);
    console.log("Registration:", registrationNo);
    console.log("================================");
}

finishAdmin();