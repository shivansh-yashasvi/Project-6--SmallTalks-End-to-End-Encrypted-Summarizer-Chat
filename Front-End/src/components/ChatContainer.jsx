import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";
import { Crypt } from 'hybrid-crypto-js';
import CryptoJS from 'crypto-js';
let crypt = new Crypt();

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef();
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [bm,setbm]=useState("");

  useEffect(() => {
    const getChats = async() => {
      const data = await JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
      );
      const response = await axios.post(recieveMessageRoute, {
        from: data._id,
        to: currentChat._id,
      });

      const messages = response.data;
      var bigmsg = "";
      const decryptedMessages = messages.map((item) => {
        return ({
          fromSelf: item.fromSelf,
          message: CryptoJS.AES.decrypt(item.message, process.env.REACT_APP_PASSPHRASE).toString(CryptoJS.enc.Utf8)
        })
      })
      setMessages(decryptedMessages);
 //summarized 
      for(var i=0; i< decryptedMessages.length ; i++){
        if(decryptedMessages[i].fromSelf != true){
          bigmsg += decryptedMessages[i].message;
          bigmsg += ".";
          }
      }

      // var msgCount = decryptedMessages;
      // for (var i = 0; i < msgCount; i++) {
      //   if (response.data[i].fromSelf === false) {
      //     bigmsg += response.data[i].message;
      //     bigmsg += ". ";
      //   }
      // }
      console.log(bigmsg);
      setbm(bigmsg);

    }
    getChats();

  }, [currentChat]);

  useEffect(() => {
    const getCurrentChat = async () => {
      if (currentChat) {
        await JSON.parse(
          localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
        )._id;
      }
    };
    getCurrentChat();
  }, [currentChat]);

  const encryptMessage = async (message) => {
    let encrypted = crypt.encrypt(currentChat.publicKey, message);
    return encrypted;
  }

  const handleSendMsg = async (msg) => {
    const data = await JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
    );
    const encrypted = await encryptMessage(msg);

    socket.current.emit("send-msg", {
      to: currentChat._id,
      from: data._id,
      msg: encrypted
    });
    console.log(encrypted);
    await axios.post(sendMessageRoute, {
      from: data._id,
      to: currentChat._id,
      message: CryptoJS.AES.encrypt(msg, process.env.REACT_APP_PASSPHRASE).toString(),
    });

    const msgs = [...messages];
    msgs.push({ fromSelf: true, message: msg });
    setMessages(msgs);
  };

  useEffect( () => {
    if (socket.current) {
      socket.current.on("msg-recieve", async (msg) => {
        const privateKey = await JSON.parse(
          localStorage.getItem(process.env.REACT_APP_PRIVATE_KEY)
        );
        const decrypted = crypt.decrypt(privateKey, msg);
        setArrivalMessage({ fromSelf: false, message: decrypted.message });
      });
    }
  }, []);

  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

async function summarize()
  {
    const responsesummary = await axios.post('https://messsage-summarizer.herokuapp.com/text', {
            id: 1,
            text: bm
        }).then(function (responsesummary) {
          console.log(responsesummary.data.summary.map((vals)=>{console.log(vals)}));
        alert(responsesummary.data.summary.toString());
        })
        .catch(function (error) {
          console.log(error);
      });
  }
  
  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <img
              src={`data:image/svg+xml;base64,${currentChat.avatarImage}`}
              alt=""
            />
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
          </div>
        </div>
        <div>
          <button className="summarizer_btn" onClick={summarize}>Summarize</button>
        </div>
        <Logout />
      </div>
      <div className="chat-messages">
        {messages.map((message) => {
          return (
            <div ref={scrollRef} key={uuidv4()}>
              <div
                className={`message ${
                  message.fromSelf ? "sended" : "recieved"
                }`}
              >
                <div className="content ">
                  <p>{message.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ChatInput handleSendMsg={handleSendMsg} />
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    grid-template-rows: 15% 70% 15%;
  }
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      .avatar {
        img {
          height: 3rem;
        }
      }
      .username {
        h3 {
          color: white;
        }
      }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 40%;
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #d1d1d1;
        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
      }
    }
    .sended {
      justify-content: flex-end;
      .content {
        background-color: #4f04ff21;
      }
    }
    .recieved {
      justify-content: flex-start;
      .content {
        background-color: #9900ff20;
      }
    }
  }
`;
