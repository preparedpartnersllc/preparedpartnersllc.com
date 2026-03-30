exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { email, name } = JSON.parse(event.body || '{}');
  if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };

  const API_KEY = process.env.MAILCHIMP_API_KEY;
  const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
  const DC = API_KEY.split('-').pop(); // datacenter from API key

  const url = `https://${DC}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`;

  const nameParts = (name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        merge_fields: { FNAME: firstName, LNAME: lastName }
      })
    });

    const data = await res.json();

    // 400 with "Member Exists" is fine — already subscribed
    if (res.ok || data.title === 'Member Exists') {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: data.detail || 'Mailchimp error' }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
