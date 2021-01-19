import prisma from "../src/prismaClient";

const users = [
  {
    email: "bobo@test.com",
    name: "bobo"
  },
  {
    email: "bibi@test.com",
    name: "bibi"
  },
  {
    email: "bubu@test.com",
    name: "bubu"
  }
];

async function seed() {
  for (let user of users) {
    await prisma.user.create({
      data: {
        ...user,
        friendships: {}
      }
    });
  }

  const friendships = [
    {
      a: "bobo@test.com",
      b: "bibi@test.com"
    },
    {
      a: "bobo@test.com",
      b: "bubu@test.com"
    },
    {
      a: "bubu@test.com",
      b: "bibi@test.com"
    }
  ];

  for (let f of friendships) {
    let { a, b } = f;
    await prisma.friendship.create({
      data: {
        friendshipType: "Friend",
        users: {
          connect: [{ email: a }, { email: b }]
        }
      }
    });
  }

  console.log("done seeding");

  process.exit(0);
}

seed();
