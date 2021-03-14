const { google } = require('googleapis');
const PRIVATE_CONFIG = require('../../private-config.json');
const { getAccessToken } = require('../../tokens');
const express = require('express');

const oauth2Client = new google.auth.OAuth2({
  clientId: PRIVATE_CONFIG.googleOAuth.web.client_id,
  clientSecret: PRIVATE_CONFIG.googleOAuth.web.client_secret
});
const calendar = google.calendar({
  version: 'v3',
  auth: oauth2Client
});

module.exports = imports => {
  const { db, Sentry, logger } = imports;

  const router = express.Router();

  router.use(express.json());

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
          timeMax,
          singleEvents: true
        });

        return {
          backgroundColor: cal.backgroundColor,
          foregroundColor: cal.foregroundColor,
          events: data.data.items
        };
      });
      const events = await Promise.all(result);
      res.json(events);
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }
  });

  router.post('/', async (req, res) => {
    const { events } = req.body;

    try {
      for (let event of events) {
        await db.addCalendarEvent(event, req.user.id);
      }
    } catch (error) {
      Sentry.captureException(error);
      logger.error(error);
      return res.status(500).json(false);
    }
    res.json(true);
  });

  router.get('/myevents/:time', async (req, res) => {
    const { time } = req.params;

    const timeMin = new Date(time);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + 1);

    try {
      const data = await db.getGoogleCalendarEvents(
        req.user.id,
        timeMin,
        timeMax
      );
      res.json(data);
    } catch (error) {
      Sentry.captureException(error);
      logger.error(error);
      res.json({ error });
    }
  });

  return router;
};
