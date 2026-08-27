CREATE TABLE auth.farm_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    department VARCHAR(100) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    village VARCHAR(100) NOT NULL,
    farm_name VARCHAR(150) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
