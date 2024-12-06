import { DataSource } from "typeorm";
import { Order } from "../entities/Order";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "naabtvc3p6olsholi54v4mmmnm.dsql.us-east-1.on.aws",
    port: 5432,
    username: "admin",
    password: "naabtvc3p6olsholi54v4mmmnm.dsql.us-east-1.on.aws/?Action=DbConnectAdmin&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAVV2N3GNTZLDAW7OL%2F20241206%2Fus-east-1%2Fdsql%2Faws4_request&X-Amz-Date=20241206T065759Z&X-Amz-Expires=900&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEG8aCXVzLWVhc3QtMSJHMEUCIAVlh72F0mf0gZNGKHQBw5FAxsPh%2BW%2Ff5UCK29sv8ABUAiEAwnilkkTbycyn9XktVAft%2Bgp88Lb32FOEd7kKZ9QvVtsq1QIIKBABGgwzOTA0Njg0MTYzNTkiDIqm2XV0hAlKyXEaxCqyAjSDnQe%2BV0%2B4NL3j0u%2F6zL9IiRWCswh%2B0CLl%2FudXZrZ6crEhcNohAH0grv4foZ5tQjHKQoa5k6e8796Edn%2BoZiLfvywS8FpO4cG%2FXxU3297dG0FHPMiZmZ9TIk6lcttOeU4uKneWFgzSaBZm1zhdGBIFncdz8I1TSuK3fRitWrJ9cd1%2FnCDRDUA9loflW%2BToqVE%2B%2FfEbkf447nSOwnKQ%2FqXYw6g3DhX26tVB2ojB4%2B5FGKYnXMBiJzzEBs8WQEMCd5%2FqzAwDp4M5Bs2yw5kd9BQvREq5v1TXGVNQzDtMhNlxgl4zNqN59bSMJwM9piCsl95NPqmMO38DV37ps02iK6MJ1q%2BqRcDud0Of5K8w6M4XjRD1dIeqe2YUUFMlvO6Vj3hluhbRMdJw%2B9jvaM1GINhnTzD4ncq6BjrwAYhf1H%2BPGyHzdrx9v267smbYzunTMsvAMfMKjf%2FjznVzWM4zH2PUEQv%2BuwomtS58jos%2Fu7w4T2LxtmjPdTmgwzWTxjXa7d8luTYDQNpTyXVTf7CD2LPCqll9oSokkzGxQUX5PNk8ataVHrO3FGjLIfJ1oN8OK67SHINUjS4uqdXvHdIKkhpQrk1sxAoxz0DhfQ17BFx7idFZPvwI4zw8%2B3UMaTvlaZxxerw7ijOl2mwxMQuxF6vcuwyL5HVbj2H9e0ep5evWbC6Js7%2BrDullImYVvUjs9vdSs5gDe8GI5kC0wtofviEwc7JjyajZ7CHQtg%3D%3D&X-Amz-Signature=58af2b42c9495ebd1ca83ba32fd6f963ff04351cd286af1ff4cd20db6bf3c264&X-Amz-SignedHeaders=host",
    database: "postgres",
    synchronize: false,
    logging: true,
    entities: [Order],
    subscribers: [],
    migrations: ["src/server/migrations/*.ts"],
    ssl: {
        rejectUnauthorized: true,
        requestCert: true
    }
});
