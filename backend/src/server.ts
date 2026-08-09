import express from 'express';
import { handler, kb } from './handler';

const app = express();

// Capture the raw body as a string (regardless of Content-Type) rather than using
// express.json(): handler() mirrors a real API Gateway proxy integration, where
// event.body is always a raw string that the handler parses itself.
app.use(express.text({ type: '*/*' }));

// Container/ALB health check target (ECS task health, not part of the Lambda-shaped
// handler's own contract) — reports liveness and which KB version is actually loaded.
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', kbVersion: kb.version });
});

app.post('/policy/quote', async (req, res) => {
    const result = await handler({ body: typeof req.body === 'string' ? req.body : '' }, {});
    res.status(result.statusCode);
    for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
    }
    res.send(result.body);
});

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => {
    console.log(`PolicyQuote backend listening on http://localhost:${port}`);
});

// ECS/Fargate sends SIGTERM before killing a task during deploys or scale-in — stop
// accepting new connections and let in-flight requests finish instead of dropping them.
function shutdown(signal: string): void {
    console.log(`Received ${signal}, shutting down gracefully.`);
    server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
