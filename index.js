const Koa = require('koa');
const { ApolloServer, gql } = require('apollo-server-koa');
// ApolloServer: 讓我們啟動 server 的 class ，不但實作許多 GraphQL 功能也提供 web application 的功能 (背後使用 express)
// gql: template literal tag, 讓你在 Javascript 中使用 GraphQL 語法
const allUsers = [
    { id: 1, name: 'Fong', age: 23, friendIds: [2, 3] },
    { id: 2, name: 'Kevin', age: 40, friendIds: [1] },
    { id: 3, name: 'Mary', age: 18, friendIds: [1] }
];
const allPosts = [
    { id: 1, authorId: 1, title: "Hello World!", content: "This is my first post.", likeGiverIds: [2] },
    { id: 2, authorId: 2, title: "Good Night", content: "Have a Nice Dream =)", likeGiverIds: [2, 3] },
    { id: 3, authorId: 1, title: "I Love U", content: "Here's my second post!", likeGiverIds: [] },
];
// 1. GraphQL Schema 定義
const typeDefs = gql`
enum HeightUnit {
    METRE
    CENTIMETRE
    FOOT
}

enum WeightUnit {
    KILOGRAM
    GRAM
    POUND
}

type Post {
    id: ID!
    author: User
    title: String
    content: String
    likeGivers: [User]
}

type User {
  id: ID!
  name: String
  age: Int
  friends: [User]

  posts: [Post]

  height(unit: HeightUnit = CENTIMETRE): Float
  weight(unit: WeightUnit = KILOGRAM): Float
}

type Query {
  "A simple type for getting started!"
  hello: String
  me: User
  users: [User]

  user(name: String!): User
}

type Mutation {
   addPost(title: String!, content: String): Post
   likePost(postId: ID!): Post
}

`;
const findUserById = id => allUsers.find(user => user.id === id);
const findUserByName = name => allUsers.find(user => user.name === name);
const filterPostsByAuthorId = authorId =>
    allPosts.filter(post => post.authorId === authorId);

const meId = 1;
const findPostById = id => allPosts.find(post => post.id === id);

// 2. Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
const resolvers = {
    Query: {
        // 需注意名稱一定要對到 Schema 中 field 的名稱
        hello: () => 'world',
        me: () => allUsers[0],
        users: () => allUsers,
        user: (root, args, context) => {
            // 取出參數。因為 name 為 non-null 故一定會有值。
            const { name } = args;
            return allUsers.find(user => user.name === name);
        }
    },
    User: {
        friends: (parent, args, context) => {
            const { friendIds } = parent;
            return allUsers.filter(user => friendIds.includes(user.id));
        },
        height: (parent, args, _) => {
            const { unit } = args;
            if (!unit || unit === "CENTIMETRE") return parent.height;
            else if (unit === "METRE") return parent.height / 100;
            else if (unit === "FOOT") return parent.height / 30.48;
            throw new Error(`Height unit "${unit}" not supported.`);
        },

        weight: (parent, args, context) => {
            const { unit } = args;
            // 支援 default 值 KILOGRAM
            if (!unit || unit === "KILOGRAM") return parent.weight;
            else if (unit === "GRAM") return parent.weight * 100;
            else if (unit === "POUND") return parent.weight / 0.45359237;
            throw new Error(`Weight unit "${unit}" not supported.`);
        },

        posts: (parent, args, context) => {
            // parent.id 為 userId
            return filterPostsByAuthorId(parent.id);
        }
    },

    Post: {
        likeGivers: (parent, args, context) => {
            return parent.likeGiverIds.map(id => findUserById(id));
        },
        author: (parent, args, context) => {
            return findUserById(parent.authorId);
        }
    },

    Mutation: {
        addPost: (root, args, context) => {
            const { title, content } = args;
            // 新增 post
            allPosts.push({
                id: allPosts.length + 1,
                authorId: meId,
                title,
                content,
                likeGivers: []
            });
            // 回傳新增的那篇 post
            return allPosts[allPosts.length - 1];
        },

        likePost: (root, args, context) => {
            const { postId } = args;
            const post = findPostById(postId);
            if (!post) throw new Error(`Post ${psotId} Not Exists`);

            if (post.likeGiverIds.includes(meId)) {
                // 如果已經按過讚就收回
                const index = post.likeGiverIds.findIndex(v => v === userId);
                post.likeGiverIds.splice(index, 1);
            } else {
                // 否則就加入 likeGiverIds 名單
                post.likeGiverIds.push(meId);
            }
            return post;
        },
    },
};

// 3. 初始化 Web Server ，需傳入 typeDefs (Schema) 與 resolvers (Resolver)
const server = new ApolloServer({
    // Schema 部分
    typeDefs,
    // Resolver 部分
    resolvers
});

const app = new Koa();
server.applyMiddleware({ app });
// alternatively you can get a composed middleware from the apollo server
// app.use(server.getMiddleware());

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`),
);

