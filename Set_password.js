import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token und Passwort erforderlich' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
  }

  try {
    const tokenData = JSON.parse(atob(token));
    const { userId, email, exp } = tokenData;

    console.log(`Processing password reset for user: ${email}`);

    if (Date.now() > exp) {
      console.log('Token expired');
      return res.status(400).json({ error: 'Token ist abgelaufen' });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables!');
      return res.status(500).json({ 
        error: 'Server-Konfigurationsfehler',
        details: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set'
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Updating password via Supabase Admin API...');

    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { password: password }
    );

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ 
        error: 'Fehler beim Setzen des Passworts',
        details: error.message 
      });
    }

    console.log(`✅ Password set successfully for user: ${email}`);

    return res.status(200).json({ 
      success: true,
      message: 'Passwort erfolgreich gesetzt'
    });

  } catch (error) {
    console.error('Error in set-password API:', error);
    return res.status(500).json({ 
      error: 'Interner Serverfehler',
      details: error.message 
    });
  }
}
