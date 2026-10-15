import { FastifyInstance } from "fastify";

export async function eventRoutes (app: FastifyInstance) {
    app.get("/events",async()=>{
        return { message : "Events Endpoint"};
    });
}