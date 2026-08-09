import express from 'express';
import { handler } from './handler';

const app = express();

// Capture the raw body as a string (regardless of Content-Type) rather than using
// express.json(): handler() mirrors a real API Gateway proxy integration, where
// event.body is always a raw string that the handler parses itself.
app.use(express.text({ type: '*/*' }));

app.post('/policy/quote', async (req, res) => {
    const result = await handler({ body: typeof req.body === 'string' ? req.body : '' }, {});
    res.status(result.statusCode);
    for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
    }
    res.send(result.body);
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
    console.log(`PolicyQuote backend listening on http://localhost:${port}`);
});
