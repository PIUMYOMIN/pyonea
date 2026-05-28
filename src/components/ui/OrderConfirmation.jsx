import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CheckCircleIcon,
  TruckIcon,
  HomeIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon
} from "@heroicons/react/24/outline";
import i18n from "../../i18n";

// Utility function to format currency
function formatMMK(amount) {
  return `${amount.toLocaleString("en-MM", { maximumFractionDigits: 0 })} ${i18n.t("common.currency.mmk", "MMK")}`;
}

const OrderConfirmation = () => {
  // In a real app, you would get this data from the location state or API
  // For demonstration, we'll use sample data
  const orderData = {
    id: "ORD-123456",
    date: new Date().toLocaleDateString(),
    status: "Processing",
    items: [
      { id: 1, name: "Mobile Legends Diamonds", price: 25000, quantity: 1 },
      { id: 2, name: "PUBG UC", price: 50000, quantity: 2 },
      {
        id: 3,
        name: "Genshin Impact Genesis Crystals",
        price: 45000,
        quantity: 1
      }
    ],
    subtotal: 170000,
    shipping: 0,
    tax: 0,
    total: 170000,
    paymentMethod: "KBZ Pay",
    shippingAddress: {
      name: "John Doe",
      street: "123 Main Street",
      city: "Yangon",
      region: "Yangon Region",
      phone: "+959123456789"
    },
    estimatedDelivery: "2-3 business days"
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Order Confirmation
            </h1>
          </div>
          <Link
            to="/"
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <HomeIcon className="h-5 w-5 mr-1" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Success Message */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900">
            Thank you for your order!
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Your order #{orderData.id} has been placed successfully.
          </p>
          <p className="mt-2 text-gray-500">
            We've sent a confirmation email with your order details.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Order Summary
                </h2>
              </div>

              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-md font-medium text-gray-900">
                      Order #{orderData.id}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Placed on {orderData.date}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {orderData.status}
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    Items
                  </h3>
                  <ul className="divide-y divide-gray-200">
                    {orderData.items.map(item =>
                      <li key={item.id} className="py-4 flex justify-between">
                        <div className="flex items-center">
                          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              Qty: {item.quantity}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatMMK(item.price * item.quantity)}
                        </p>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6">
                  <dl className="space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Subtotal</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {formatMMK(orderData.subtotal)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Shipping</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {formatMMK(orderData.shipping)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Tax</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {formatMMK(orderData.tax)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-4">
                      <dt className="text-base font-medium text-gray-900">
                        Total
                      </dt>
                      <dd className="text-base font-medium text-gray-900">
                        {formatMMK(orderData.total)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="bg-white shadow rounded-lg overflow-hidden mt-8">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <TruckIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Delivery Information
                </h2>
              </div>

              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-md font-medium text-gray-900">
                      Estimated Delivery
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {orderData.estimatedDelivery}
                    </p>
                    <div className="mt-4 bg-blue-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Delivery Instructions
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        We'll send you a notification when your order is on its
                        way. For digital products, you'll receive them instantly
                        after payment confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div>
            {/* Payment Information */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <CreditCardIcon className="h-5 w-5 mr-2 text-green-600" />
                  Payment Information
                </h2>
              </div>

              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gray-100 p-3 rounded-lg">
                    <CreditCardIcon className="h-8 w-8 text-gray-500" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-md font-medium text-gray-900">
                      {orderData.paymentMethod}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Paid on {orderData.date}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-gray-600">
                      Payment Method
                    </span>
                    <span className="text-sm font-medium">
                      {orderData.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-gray-600">
                      Payment Status
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      Paid
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-gray-600">Total Amount</span>
                    <span className="text-sm font-medium">
                      {formatMMK(orderData.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white shadow rounded-lg overflow-hidden mt-8">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2 text-red-600" />
                  Shipping Address
                </h2>
              </div>

              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-gray-100 p-3 rounded-lg">
                    <UserIcon className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-md font-medium text-gray-900">
                      {orderData.shippingAddress.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {orderData.shippingAddress.street}
                      <br />
                      {orderData.shippingAddress.city},{" "}
                      {orderData.shippingAddress.region}
                    </p>
                    <div className="mt-3 flex items-center text-sm text-gray-600">
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      {orderData.shippingAddress.phone}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-white shadow rounded-lg overflow-hidden mt-8">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  What's Next?
                </h2>
              </div>

              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-start mb-6">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                    <div className="bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center">
                      1
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-md font-medium text-gray-900">
                      Order Processing
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      We're preparing your order for delivery. This usually
                      takes 1-2 business days.
                    </p>
                  </div>
                </div>

                <div className="flex items-start mb-6">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                    <div className="bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center">
                      2
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-md font-medium text-gray-900">
                      Shipping
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      You'll receive a tracking number once your order ships.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                    <div className="bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center">
                      3
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-md font-medium text-gray-900">
                      Delivery
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Your order will arrive in {orderData.estimatedDelivery}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 max-w-3xl mx-auto flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/products"
            className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <ShoppingBagIcon className="h-5 w-5 mr-2" />
            Continue Shopping
          </Link>
          <Link
            to="/buyer"
            className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-gray-300 text-sm sm:text-base font-medium rounded-md shadow-sm text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600"
          >
            <TruckIcon className="h-5 w-5 mr-2" />
            View Order Status
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Have questions about your order?{" "}
              <a href="#" className="text-blue-600 hover:text-blue-800">
                Contact Support
              </a>
            </p>
            <p className="mt-4 text-sm text-gray-500">
              &copy; 2023 GameTopup. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OrderConfirmation;
