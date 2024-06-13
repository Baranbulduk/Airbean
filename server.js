import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import errorHandler from "./middlewares/errorHandler.js";
import orderRouter from "./routes/order.js";
import cartRouter from "./routes/cart.js";
import authRouter from "./routes/auth.js";
import checkoutRouter from "./routes/checkout.js";
import orderHistoryRouter from "./routes/orderHistory.js";
import aboutRouter from "./routes/about.js"
import statusRouter from "./routes/status.js";
import notFoundMiddleware from "./middlewares/urlNotFound.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

global.currentUser = null;

app.use(express.json());



app.use((req, res, next) => {
    console.log(`${req.method} request for '${req.url}' - ${JSON.stringify(req.body)}`);
    next();
});

app.use('/menu', orderRouter);
app.use('/cart', cartRouter);
app.use('/auth', authRouter);
app.use('/checkout', checkoutRouter);
app.use('/orderHistory', orderHistoryRouter);
app.use('/about', aboutRouter);
app.use('/status', statusRouter);
app.use(notFoundMiddleware)

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    const error = new Error('Page not found');
    error.status = 404;
    next(error);
});

app.use(errorHandler);

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
