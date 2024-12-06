import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class AddButtonColumns1701927600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // First check if the columns exist
        const hasButtonText = await queryRunner.hasColumn("order", "buttonText");
        const hasShouldError = await queryRunner.hasColumn("order", "shouldError");

        // Add columns if they don't exist
        if (!hasButtonText) {
            await queryRunner.query(`
                ALTER TABLE "order" 
                ADD COLUMN "buttonText" VARCHAR(255)
            `);
        }

        if (!hasShouldError) {
            await queryRunner.query(`
                ALTER TABLE "order" 
                ADD COLUMN "shouldError" BOOLEAN DEFAULT TRUE
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // First check if the columns exist
        const hasButtonText = await queryRunner.hasColumn("order", "buttonText");
        const hasShouldError = await queryRunner.hasColumn("order", "shouldError");

        // Drop columns if they exist
        if (hasShouldError) {
            await queryRunner.query(`
                ALTER TABLE "order" 
                DROP COLUMN "shouldError"
            `);
        }

        if (hasButtonText) {
            await queryRunner.query(`
                ALTER TABLE "order" 
                DROP COLUMN "buttonText"
            `);
        }
    }
}
