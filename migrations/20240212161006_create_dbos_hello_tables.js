const { Knex } = require("knex");

exports.up = async function(knex) {
  await knex.schema.createTable('orders', table => {
    table.increments('id').primary();
    table.enu('side', ['buy', 'sell']);
    table.integer('price');
    table.integer('size');
    table.integer('trader');    
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('bids', table => {
    table.integer('order_id').primary();
    // table.foreign('order_id').reference('orders.id');
    table.integer('price');
    table.index('price');
  });

  return knex.schema.createTable('asks', table => {
    table.integer('order_id').primary();
    // table.foreign('order_id').reference('orders.id');
    table.integer('price');
    table.index('price');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('orders');
  await knex.schema.dropTable('bids');
  return knex.schema.dropTable('asks');
};

