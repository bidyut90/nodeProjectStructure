import dotenv from 'dotenv'
import connectDB from './db'
import { app } from './app'



dotenv.config({
  path:'./.env'
})

connectDB()
.then(()=>{
  app.listen(process.env.Port || 8000, ()=>{
    console.log(`connection sucessfuly : ${process.env.PORT}`)
  })
}
)
.catch((err)=>{
  console.log("Mongo db connection failded",err)
})


