const { google } = require('googleapis');
const PRIVATE_CONFIG = require('../../private-config.json');
const express = require('express');

const oauth2Client = new google.auth.OAuth2({
  clientId: PRIVATE_CONFIG.googleOAuth.web.client_id,
  clientSecret: PRIVATE_CONFIG.googleOAuth.web.client_secret
});
const calendar = google.calendar({
  version: 'v3',
  auth: oauth2Client
});

const extractTokens = (req, res) => {
  const { accessToken, refreshToken } = req.session;
  if (!refreshToken) {
    req.session.destroy(err => {
      if (err) {
        res.status(500).send({
          status: 'error',
          message: 'logout failed'
        });
      } else {
        res.status(200).send({
          status: 'ok'
        });
      }
    });
  } else {
    return { accessToken, refreshToken };
  }
};

module.exports = imports => {
  const { db, Sentry, logger } = imports;

  const router = express.Router();

  router.use(express.json());

  router.get('/:time', async (req, res) => {
    const { time } = req.params;
    const { accessToken, refreshToken } = extractTokens(req, res);

    oauth2Client.credentials = {
      access_token: accessToken,
      refresh_token: refreshToken
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
          calId: cal.id,
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

  router.get('/event/:calId/:id', async (req, res) => {
    const { calId, id } = req.params;

    const { accessToken, refreshToken } = extractTokens(req, res);

    oauth2Client.credentials = {
      access_token: accessToken,
      refresh_token: refreshToken
    };

    try {
      const event = await calendar.events.get({
        calendarId: calId,
        eventId: id
      });
      res.json(event.data);
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }
  });

  router.get('/cal/:id', async (req, res) => {
    const { id } = req.params;

    const { accessToken, refreshToken } = extractTokens(req, res);

    oauth2Client.credentials = {
      access_token: accessToken,
      refresh_token: refreshToken
    };

    try {
      const cal = await calendar.calendarList.get({ calendarId: id });
      res.json(cal.data);
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

  router.delete('/myevents/:id', async (req, res) => {
    const { id } = req.params;

    try {
      await db.deleteCalendarEvent(id);
    } catch (error) {
      Sentry.captureException(error);
      logger.error(error);
      res.json({ error });
    }
  });

  return router;
};
