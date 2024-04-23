import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'


const app: Application = express()

app.use(cors())

app.use(express.json({limit:'20kb'}))

app.use(express.urlencoded({
    extended:true,limit:'16kb'
}))
app.use(cookieParser())

app.use(express.static('public'))

//routes import 
import userRouter from './routes/user.routes'
// routes declaration
app.use('/api/v1/users',userRouter)


export {app}