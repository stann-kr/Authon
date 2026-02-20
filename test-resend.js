const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('/app/.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) {
    env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const email = "testresend" + Date.now() + "@example.com";
  console.log("Inviting", email);
  let res = await supabase.auth.admin.inviteUserByEmail(email);
  console.log("First invite error:", res.error?.message || "Success");

  console.log("Resending with inviteUserByEmail...");
  let res2 = await supabase.auth.admin.inviteUserByEmail(email);
  console.log("Second invite (inviteUserByEmail) error:", res2.error?.message || "Success");

  console.log("Resending with auth.resend...");
  let res3 = await supabase.auth.resend({ type: 'invite', email });
  console.log("Third invite (auth.resend) error:", res3.error?.message || "Success");
}
test();
