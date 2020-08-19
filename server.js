const express=require('express');
const http=require('http')
const socketio=require('socket.io')
const UserModel=require('./users')
const { v4: uuidV4 } = require('uuid')
const app=express()
const cors=require('cors');
const { Socket } = require('dgram');

const server=http.createServer(app);

const io=socketio(server);

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
    });

const port=process.env.PORT || 4000;

app.use(cors({
    origin: '*'
  }));
app.get('/generateRoomId',(req,res)=>{


    let Uid=uuidV4()
    console.log(Uid)
    res.json({success:true,roomId:`${Uid}`})

})


io.on('connect',(socket)=>{
     
    socket.on('cJoin',({name,email})=>{
      
        let {user,existingUser}=UserModel.addUser({id:socket.id,name,email});
          
        if(existingUser)
        {
        existingUser.id=socket.id
        }
        let lis=UserModel.getAllUsers();

        io.emit('users',{users:lis})

    })

    socket.on('callAnswer',(responseData)=>{

        let user1=UserModel.getByEmail(responseData.to);
       console.log(responseData);
        io.to(user1.id).emit("AnswerToCall",responseData);

    })

    socket.on('call',({to,from})=>{

        let user1=UserModel.getByEmail(to.email);
        io.to(user1.id).emit('callFrom',from)
    })

    
    socket.on("join",({name,email,roomId,userId},callback)=>{
          console.log(roomId)
        const {user,existingUser}=UserModel.addUser({id:socket.id,name,email,roomId,userId});

        if(existingUser)
        {
            existingUser.roomId=roomId;
            existingUser.userId=userId;
        }

    socket.join(roomId);

    socket.to(roomId).broadcast.emit('user-connected', userId)
    console.log("user added")
     socket.emit('message',{name:'Admin',email:"admin@admin",message:`Welcome To Meeting, ${name}`})
    socket.to(roomId).broadcast.emit('message',{name:'Admin',email,message:`${name} has Joined The Meeting`})

    callback({success:true,message:'done '});


    socket.on('disconnect', () => {
        socket.to(roomId).broadcast.emit('user-disconnected', userId)
      })
  
       
    })



    socket.on("joinptop",({name,email,pRoomId,userId},callback)=>{
      
      const {user,existingUser}=UserModel.addUser({id:socket.id,name,roomId:pRoomId,email,userId});

      if(existingUser)
      {
          existingUser.isInRoom=false;
          existingUser.roomId=pRoomId;
         existingUser.userId=userId;
      }
      console.log(pRoomId)

      socket.join(pRoomId);
      socket.to(pRoomId).broadcast.emit('callUser',userId);
  callback({success:true,message:'done '});


  socket.on('disconnect', () => {
      socket.to(pRoomId).broadcast.emit('user-disconnected', userId)
    })

     
  })

  socket.on('ptop',(user)=>{

    let user1=UserModel.getByEmail(user.email);
     
    socket.to(user1.id).broadcast.emit('callUser',user.userId);

  })




    
    socket.on('send_message',message=>{
        console.log("user send message")
        io.to(message.roomId).emit('message',message)
    })


})

var PeerServer = require('peer').PeerServer;

var server2 = PeerServer({
    port: 9090,
    path: '/peerjs',
  
});




server.listen(port,()=>{


    console.log("Server is listening at :"+port);
})