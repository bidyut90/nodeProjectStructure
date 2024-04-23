
import mongoose from 'mongoose'
import {DB_NAME} from '../utils/constants'




const connectDB = async ()=>{
    try {
        const connectionInstacne = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(connectionInstacne.connection.host)
    } catch (error) {
        console.log('MONGODB connection error',error)
        process.exit(1)
        
    }
}


export default connectDB