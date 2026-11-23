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

async function createAdmin() {
    const registrationNo = "ADMIN001";
    const fullName = "Kumar Soumya Ranjan";
    const username = "kumar";
    const password = "Kumar@19792006";

    const internalEmail =
        `${registrationNo.toLowerCase()}@accounts.reckmate.local`;

    const { data, error } = await supabase.auth.admin.createUser({
        email: internalEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
            registration_no: registrationNo,
            full_name: fullName
        }
    });

    if (error) {
        console.error("Auth user creation failed:", error.message);
        return;
    }

    const userId = data.user.id;

    const { error: profileError } = await supabase
        .from("Profiles")
        .insert({
            id: userId,
            registration_no: registrationNo,
            full_name: fullName,
            username: username,
            role: "admin",
            must_change_password: false,
            rating: 1000
        });

    if (profileError) {
        console.error("Profile creation failed:", profileError.message);
        return;
    }

    console.log("ADMIN CREATED SUCCESSFULLY");
    console.log("Registration:", registrationNo);
    console.log("Username:", username);
    console.log("User ID:", userId);
}

createAdmin();