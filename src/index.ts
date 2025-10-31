import express, { Express } from 'express'
import connectDb from './util/db'
import Routes from './routes'
import dotenv from 'dotenv'
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs"
import http from 'http'
import {setupWebSocket} from './websocket/server'

const app: Express = express()
const swaggerDocument = YAML.load("./src/openapi/swagger.yaml")

const server = http.createServer(app)
setupWebSocket(server)

dotenv.config()
connectDb()

const PORT = process.env.PORT || 3000
app.use(express.json())
app.use('/', Routes)
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

server.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT)
})