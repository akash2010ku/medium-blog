import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign, verify } from 'hono/jwt'
import { cors } from 'hono/cors'


const app = new Hono<{
  Bindings: {
    DATABASE_URL: string,
    JWT_SECRET: string
  }       
}>()

app.use(cors({
  origin: '*'
}))

app.use('/api/v1/blog/*', async (c, next) => {
  const header = c.req.header('authentication') || "";
  const response = await verify(header, c.env.JWT_SECRET);
  if (response.id) {
   await next();
  } else {
    c.status(403)
    return c.json({
      msg: "Unauthorized"
    })
  }
})

app.post('/api/v1/signup', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  try {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
        name: body.name
      }
    });
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.json({ jwt });
  } catch (e) {
    console.log(e)
   
    return c.json({ error: "error while signing up" });
  }
})

app.post('/api/v1/signin', async (c) => {

  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());
  const body = await c.req.json();
  const user = await prisma.user.findUnique({
    where: {
      email: body.email,
      password: body.password
    }
  })

  if (!user) {
    c.status(403)
    return c.json({
      msg: "User not find"
    })
  }

  const jwt = await sign({ user: user.id }, c.env.JWT_SECRET)
  return c.json({ jwt })
})

app.post('/api/v1/blog', async (c) => {

  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());
  try{
  const body = await c.req.json();
  const post = await prisma.post.create({
    data: {
      content: body.content,
      title: body.title,
      authorId: body.authorId,
      published: body.published

    }
  })
  return c.json({result:post})

}catch(error){
  c.status(403);
  return c.json({
    msg:"Internal server error ",error
  })
}






})

app.put('/api/v1/blog:id', async (c) => {

  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try{
    const body=await c.req.json();
    const update=await prisma.post.update({
      where:{
        id:body.id,
      },
      data:{
        title:body.title,
        content:body.content,

      }
    })
    return c.json(update)
  }catch(error){
    c.status(403);
    return c.json({
      msg:"internal server error"
    })
  }

  
  
})


app.get('/api/v1/blog', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const body = await c.req.json();
    console.log(body.id);

    const blogData = await prisma.user.findUnique({
      where: {
        id: body.id,
      },
      select: {
        posts: true,
      },
    });

    if (!blogData) {
      return c.text('No blog data found.', 404);
    }

    return c.json(blogData);
  } catch (error) {
    console.error(error);
    return c.text('An error occurred.', 500);
  } finally {
    await prisma.$disconnect();
  }
});




export default app
