import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveButtonColumns1701927600001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("order", "buttonText");
        await queryRunner.dropColumn("order", "shouldError");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order" ADD "buttonText" varchar`);
        await queryRunner.query(`ALTER TABLE "order" ADD "shouldError" boolean`);
    }
}
