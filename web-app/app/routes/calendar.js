const { google } = require('googleapis');
const PRIVATE_CONFIG = require('../../private-config.json');
const { getAccessToken } = require('../../tokens');

const oauth2Client = new google.auth.OAuth2({
  clientId: PRIVATE_CONFIG.googleOAuth.web.client_id,
  clientSecret: PRIVATE_CONFIG.googleOAuth.web.client_secret
});
const calendar = google.calendar({
  version: 'v3',
  auth: oauth2Client
});

module.exports = imports => {
  const { db } = imports;

  const router = require('express').Router();

  router.get('/:time', async (req, res) => {
    const { time } = req.params;
    const { tkn } = req.cookies;
    if (!tkn) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    oauth2Client.credentials = {
      access_token: getAccessToken(),
      refresh_token: tkn
    };

    const timeMin = new Date(time);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + 1);

    try {
      const calendars = (await calendar.calendarList.list()).data.items;
      const result = calendars.map(async cal => {
        const data = await calendar.events.list({
          calendarId: cal.id,
          timeMin,
          timeMax
        });

        return {
          backgroundColor: cal.backgroundColor,
          foregroundColor: cal.foregroundColor,
          events: data.data.items
        };
      });
      const events = await Promise.all(result);
      res.json(events);
    } catch (error) {
      console.log(error);
    }
  });

  return router;
};
