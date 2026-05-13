import OrderRow from './OrderRow'

export default function OrderList({ orders }) {
  return (
    <ul className="orders">
      {orders.map(order => (
        <OrderRow key={order._id} order={order} />
      ))}
    </ul>
  )
}
