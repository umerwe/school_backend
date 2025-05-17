import { app } from './app.js';
import { connectDB } from './db/index.js';
import 'dotenv/config'

connectDB()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Server running on PORT: ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.log(`Error: ${error}`)
    })