import prisma from './prismaClient';
import path from 'path';
import express from 'express';
import http from 'http';
import {ApolloServer, gql} from 'apollo-server-express';
import makeIO from 'socket.io';

async function seed() {}
seed();

const typeDefs = gql`
  type Query {
    hello(name: String): String!
    messages(roomId: String!): [String!]!
    friends(email: String!): [Friendship!]!
    users: [User!]!
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
    createUser(email: String, name: String): String
  }
`;

const resolvers = {
  Query: {
    hello: (_: any, {name}: any) => {
      return `hello ${name}`;
    },
    users: () => {
      return prisma.user.findMany();
    },
    friends: async (_: any, {email}: {email: string}) => {
      let friends = await prisma.friendship.findMany({
        where: {
          friendshipType: 'Friend',
          users: {
            some: {email},
          },
        },
        include: {
          users: {
            where: {
              NOT: {
                email,
              },
            },
          },
        },
      });

      return friends;
    },
    messages: async (_: any, {roomId}: {roomId: string}) => {
      let friendship = await prisma.friendship.findUnique({
        where: {
          id: roomId,
        },
        include: {
          messages: {
            include: {
              sender: {},
            },
          },
        },
      });

      return friendship?.messages;
    },
  },
  Mutation: {
    createUser: async (
      _: any,
      {email, name}: {email: string; name: string}
    ) => {
      let result = await prisma.user.create({
        data: {
          email,
          name,
        },
      });

      console.log('result ?', result);
      return name;
    },
  },
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: (contexts) => ({
    ...contexts,
    prisma,
  }),
});
let app = express();
app.use(express.static(path.join(__dirname, '../public')));
apolloServer.applyMiddleware({app});
let server = http.createServer(app);

// @ts-ignore
const io = makeIO(server);

io.on('connection', (socket: any) => {
  console.log('someone in');
  socket.on('join-friend-room', (roomId: number) => {
    console.log('joined room id ?', roomId);

    socket.emit('message', `Welcome ${socket.id}`);
  });
});

server.listen(4000, () => {
  console.log(`Server running on http://localhost${4000}`);
});
