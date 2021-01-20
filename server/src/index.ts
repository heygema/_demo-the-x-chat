import path from "path";
import express from "express";
import http from "http";
import { ApolloServer, gql } from "apollo-server-express";
import makeIO from "socket.io";

import prisma from "./prismaClient";

const typeDefs = gql`
  type Query {
    hello(name: String): String!
    messages(roomId: String!): [Message!]!
    friends(email: String!): [Friendship!]!
    users: [User!]!
  }

  type Message {
    id: String
    sender: User
    content: String
    createdAt: String
  }

  type User {
    id: String!
    email: String!
    name: String!
  }

  type Friendship {
    id: String!
    friendshipType: FriendshipType!
    users: [User!]!
  }

  enum FriendshipType {
    Friend
    Group
  }

  type Mutation {
    createUser(email: String, name: String): User
  }
`;

const resolvers = {
  Query: {
    hello: (_: any, { name }: any) => {
      return `hello ${name}`;
    },
    users: () => {
      return prisma.user.findMany();
    },
    friends: async (_: any, { email }: { email: string }) => {
      let friends = await prisma.friendship.findMany({
        where: {
          friendshipType: "Friend",
          users: {
            some: { email }
          }
        },
        include: {
          users: {
            where: {
              NOT: {
                email
              }
            }
          }
        }
      });

      return friends;
    },
    messages: async (_: any, { roomId }: { roomId: string }) => {
      let friendship = await prisma.friendship.findUnique({
        where: {
          id: roomId
        },
        include: {
          messages: {
            include: {
              sender: {}
            }
          }
        }
      });

      return friendship?.messages;
    }
  },
  Mutation: {
    createUser: async (
      _: any,
      { email, name }: { email: string; name: string }
    ) => {
      let result = await prisma.user.create({
        data: {
          email,
          name
        }
      });

      return result;
    }
  }
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: (contexts) => ({
    ...contexts,
    prisma
  })
});
let app = express();
app.set("prisma", prisma);
app.use(express.static(path.join(__dirname, "../public")));
apolloServer.applyMiddleware({ app });
let server = http.createServer(app);

// @ts-ignore
const io = makeIO(server);

io.on("connection", (socket: any) => {
  socket.on("join-friend-room", (roomId: number) => {
    socket.join(roomId);
    socket.emit("message", `Welcome ${socket.id}`);
  });

  type MessageFromUser = {
    email: string;
    roomId: string;
    content: string;
  };

  // for security purpose, get sender id from cached roomId on connectedsocket
  socket.on(
    "message-from-client",
    async ({ email, roomId, content }: MessageFromUser) => {
      // persist to db here
      let message = await prisma.message.create({
        data: {
          friendship: {
            connect: {
              id: roomId
            }
          },
          sender: {
            connect: {
              email
            }
          },
          content
        },
        include: {
          sender: {}
        }
      });

      io.to(roomId).emit("message-from-server", message);
    }
  );
});

server.listen(4000, () => {
  console.log(`Server running on http://localhost${4000}`);
});
