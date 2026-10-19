import 'dotenv/config'; // must load before routes read process.env
import express from 'express';
import cors from 'cors';
import routes from './routes.js';

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '50kb' }));
app.use('/api', routes);
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

export default app;
