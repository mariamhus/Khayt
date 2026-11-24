export const DDL = `
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_main boolean not null default false,
  next_order integer not null default 10001,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists stores_one_main on stores(is_main) where is_main;
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  email text not null unique,
  name text not null,
  password_hash text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  slug text not null,
  name jsonb not null,
  description jsonb not null,
  category text not null,
  garment text not null,
  fabric text not null,
  pattern text not null default 'solid',
  price integer not null check (price >= 0),
  compare_at integer,
  colors jsonb not null,
  sizes jsonb not null,
  featured boolean not null default false,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint products_store_slug unique (store_id, slug)
);
create index if not exists products_store on products(store_id, active, position);
alter table products add column if not exists images jsonb not null default '{}'::jsonb;
alter table products add column if not exists swatches jsonb not null default '{}'::jsonb;
create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp')),
  data bytea not null,
  width integer not null default 0,
  height integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists images_store on images(store_id);
create table if not exists stock (
  product_id uuid not null references products(id) on delete cascade,
  color text not null,
  size text not null,
  quantity integer not null default 0 check (quantity >= 0),
  primary key (product_id, color, size)
);
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  number text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  subtotal integer not null,
  shipping integer not null,
  total integer not null,
  customer_name text not null,
  phone text not null,
  city text not null,
  address text not null,
  payment text not null default 'cod',
  created_at timestamptz not null default now(),
  constraint orders_store_number unique (store_id, number)
);
create index if not exists orders_store on orders(store_id, created_at desc);
create index if not exists orders_user on orders(user_id, created_at desc);
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name jsonb not null,
  slug text not null,
  color text not null,
  size text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null
);
create index if not exists order_items_order on order_items(order_id);
create index if not exists order_items_product on order_items(product_id);
`;
