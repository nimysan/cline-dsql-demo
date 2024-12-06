import { Entity, Column, CreateDateColumn } from "typeorm";

@Entity()
export class Order {
    @Column("varchar", { primary: true })
    id!: string;

    @Column()
    customer!: string;

    @Column()
    product!: string;

    @Column("decimal", { precision: 10, scale: 2 })
    amount!: number;

    @Column({
        type: "varchar",
        length: 20,
        default: "Pending"
    })
    status!: "Completed" | "Pending" | "Processing";

    @CreateDateColumn()
    date!: Date;

    constructor(partial: Partial<Order> = {}) {
        Object.assign(this, partial);
    }
}
