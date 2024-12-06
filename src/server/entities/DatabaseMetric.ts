import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class DatabaseMetric {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    queryDuration!: number;  // in milliseconds

    @Column()
    query!: string;

    @Column({ nullable: true })
    activeConnections?: number;

    @CreateDateColumn()
    timestamp!: Date;
}
