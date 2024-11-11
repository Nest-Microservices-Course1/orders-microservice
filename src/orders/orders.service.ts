import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ChangeOrderStatusDto,
  CreateOrderDto,
  OrderPaginationDto,
} from './dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.interface';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      const productIds = createOrderDto.items.map((item) => item.productId);

      const products = await this.validateProducts(productIds);

      // 2. Calcular valores
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        /* 
        - reduce: Se utiliza para iterar sobre los elementos de createOrderDto.items y acumular el costo total (totalAmount).
        - find: Dentro del reduce, se utiliza find para buscar en products el producto que coincida con el productId del orderItem actual.
        - price: Una vez que se encuentra el producto, se extrae su precio.
        - price * orderItem.quantity: Se calcula el subtotal para ese producto, multiplicando su precio por la cantidad (quantity) solicitada en la orden.
        0 (valor inicial de acc): Especifica que el acumulador comienza en 0.
        */
        const price = products.find(
          (product) => product.id === orderItem.productId,
        ).price;

        // Calcular el subtotal para este item multiplicando el precio del producto por la cantidad solicitada
        return price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(
                  (product) => product.id === orderItem.productId,
                ).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((item) => ({
          ...item,
          productName: products.find((product) => product.id === item.productId)
            .name,
        })),
      };
      /* return this.order.create({ data: createOrderDto }); */
    } catch (error) {
      throw new RpcException(error);
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalPages = await this.order.count({
      where: {
        status: orderPaginationDto.status,
      },
    });

    const currentPage = orderPaginationDto.page;
    const perPege = orderPaginationDto.limit;

    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPege,
        take: perPege,
        where: {
          status: orderPaginationDto.status,
        },
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPege),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findUnique({
      where: { id },
      include: {
        OrderItem: { select: { productId: true, quantity: true, price: true } },
      },
    });

    const productIds = order.OrderItem.map((item) => item.productId);
    const products = await this.validateProducts(productIds);

    if (!order) {
      throw new RpcException({
        message: `Order with id #${id} not found`,
        status: 404,
      });
    }

    return {
      ...order,
      OrderItem: order.OrderItem.map((item) => ({
        ...item,
        productName: products.find((product) => product.id === item.productId)
          .name,
      })),
    };
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);

    if (order.status === status) {
      return order;
    }

    return this.order.update({ where: { id }, data: { status } });
  }

  async validateProducts(productIds: number[]): Promise<any[]> {
    try {
      // 1. Validar existencia de productos
      /* Método en el servicio de products en Products_MS que valida que los ids de los productos existan en la base de datos
        firstValueFrom convierte el tipo observable a promesa */
      return await firstValueFrom(
        this.client.send({ cmd: 'validate_products' }, productIds),
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  async createPaymentSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItem.map((item) => ({
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
        })),
      }),
    );

    return paymentSession;
  }
}
