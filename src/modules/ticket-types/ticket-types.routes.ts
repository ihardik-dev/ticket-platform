import { FastifyInstance } from "fastify";
import prisma from "../../lib/prisma.js";

export async function ticketTypeRoutes(app: FastifyInstance) {
    app.post("/events/:eventId/ticket-types",async(request , reply)=>{
        const { eventId } = request.params as { eventId : string};

        const body = request.body as {
            name:string,
            price:number,
            capacity:number,
        };

        const ticketType = await prisma.ticketType.create({
            data: {
                eventId: Number(eventId),
                name:body.name,
                price:body.price,
                capacity:body.capacity
            },
        });
        return reply.code(201).send(ticketType);
    });

    app.get("/events/:eventId/ticket-types", async (request) => {
    const { eventId } = request.params as { eventId: string };

    const ticketTypes = await prisma.ticketType.findMany({
        where: {
        eventId: Number(eventId),
        },
    });

    return ticketTypes;
    });

    app.get("/ticket-types/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const ticketType = await prisma.ticketType.findUnique({
        where: {
        id: Number(id),
        },
    });

    if (!ticketType) {
        return reply.code(404).send({
        message: "Ticket type not found!",
        });
    }

    return ticketType;
    });
    app.put("/ticket-types/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const body = request.body as {
        name: string;
        price: number;
        capacity: number;
    };

    const ticketType = await prisma.ticketType.update({
        where: {
        id: Number(id),
        },
        data: {
        name: body.name,
        price: body.price,
        capacity: body.capacity,
        },
    });

    return ticketType;
    });
}