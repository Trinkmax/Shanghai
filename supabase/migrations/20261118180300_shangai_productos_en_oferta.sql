alter table shangai.productos add column en_oferta boolean not null default false;
comment on column shangai.productos.en_oferta is 'Marcado a mano como oferta (precio ya rebajado, sin precio anterior). Con precio_oferta además muestra el % de descuento.';
create index productos_en_oferta_idx on shangai.productos (orden) where en_oferta and activo;
