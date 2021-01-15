import prisma from "./prismaClient";
import path from "path";
import express from "express";
import http from "http";
import { ApolloServer, gql } from "apollo-server-express";

const typeDefs = gql`
  type Query {
    hello(name: String): String!
    messages(roomId: String!): [String!]!
    friends: [String!]!
  }
`;

const resolvers = {
  Query: {
    hello: (_: any, { name }: any) => {
      return `hello ${name}`;
    },
    messages: () => {
      return prisma.message.findMany();
    },
    friends: () => {
      return [];
    }
  }
};

const apolloServer = new ApolloServer({ typeDefs, resolvers });
let app = express();
app.use(express.static(path.join(__dirname, "../public")));
apolloServer.applyMiddleware({ app });
let server = http.createServer(app);
server.listen(4000, () => {
  console.log(`Server running on http://localhost${4000}`);
});
