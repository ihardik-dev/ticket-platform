import Fastify from"fastify"

const app = Fastify (
    { logger : true ,}
);

app.get("/health",async() => {
    return { status : "ok "};
});

const start = async() =>{
    try {
        await app.listen({port: 3000 });
    }
    catch(error) {
        app.log.error(error);
        process.exit(1);
    }
}

start();