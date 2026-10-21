import mongoose from 'mongoose'
 const connectDB=async()=>{
  try{
      const url=process.env.MONGO_URL;
      if(!url){
        throw new Error("MONGO_URL is not defined");
      }

      const conn=await mongoose.connect(url);
      console.log(`MongoDb connected:${conn.connection.host}`);

  }catch(error){
      console.error("MongoDB connection error",error.message);
      process.exit(1);
  }
};



export default connectDB;