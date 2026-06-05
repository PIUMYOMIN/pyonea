import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChartBarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import api from "../../utils/api";
import i18n from "../../i18n";
import { exportToExcel, mmkCell, todayStr } from "../../utils/exportExcel";
import PlanFeatureGate from "./PlanFeatureGate";


const fmtK = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000)         return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return v.toLocaleString();
};
const fmtMMK = (n) => `${fmtK(n)} ${i18n.t("common.currency.mmk", "MMK")}`;

const SalesReports = ({ refreshData }) => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState("month");
  const [salesData, setSalesData] = useState({
    monthlyData: [],
    weeklyData: [],
    topProducts: [],
    summary: {
      totalSales: 0,
      totalOrders: 0,
      newCustomers: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExportSalesTrend = async () => {
    setExporting(true);
    try {
      const rows = [
        [t("seller.sales.export.date"), t("seller.sales.export.revenue_mmk"), t("seller.sales.export.orders")],
        ...data.map(d => [d.month, mmkCell(d.sales), d.orders]),
      ];
      await exportToExcel(rows, t("seller.sales.export.sales_trend_sheet"), `pyonea-sales-trend-${todayStr()}.xlsx`);
    } catch (e) { alert(e.message); } finally { setExporting(false); }
  };

  const handleExportTopProducts = async () => {
    setExporting(true);
    try {
      const rows = [
        [t("seller.sales.export.product_name"), t("seller.sales.export.units_sold"), t("seller.sales.export.revenue_mmk")],
        ...salesData.topProducts.map(p => [p.name, p.sales, mmkCell(p.revenue)]),
      ];
      await exportToExcel(rows, t("seller.sales.export.top_products_sheet"), `pyonea-top-products-${todayStr()}.xlsx`);
    } catch (e) { alert(e.message); } finally { setExporting(false); }
  };

  const handleExportFull = async () => {
    setExporting(true);
    try {
      const summary = [
        [t("seller.sales.export.report_title"), `${t("seller.sales.export.exported")}: ${new Date().toLocaleString()}`],
        [],
        [t("seller.sales.export.summary")],
        [t("seller.sales.export.total_sales_mmk"), mmkCell(salesData.summary.totalSales)],
        [t("seller.sales.total_orders"), salesData.summary.totalOrders],
        [t("seller.sales.new_customers"), salesData.summary.newCustomers],
        [],
        [t("seller.sales.export.sales_trend")],
        [t("seller.sales.export.date"), t("seller.sales.export.revenue_mmk"), t("seller.sales.export.orders")],
        ...data.map(d => [d.month, mmkCell(d.sales), d.orders]),
        [],
        [t("seller.sales.export.top_products")],
        [t("seller.sales.export.product_name"), t("seller.sales.export.units_sold"), t("seller.sales.export.revenue_mmk")],
        ...salesData.topProducts.map(p => [p.name, p.sales, mmkCell(p.revenue)]),
      ];
      await exportToExcel(summary, t("seller.sales.export.full_report_sheet"), `pyonea-full-report-${todayStr()}.xlsx`);
    } catch (e) { alert(e.message); } finally { setExporting(false); }
  };


  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [summaryResponse, topProductsResponse] = await Promise.all([
          api.get("/seller/sales-summary"),
          api.get("/seller/top-products")
        ]);

        if (summaryResponse.data.success) {
          const data = summaryResponse.data.data;
          
          // Process sales trend data
          const trendData = data.recent_trend || [];
          const monthlyData = trendData.map(item => ({
            month: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sales: parseFloat(item.revenue) || 0,
            orders: parseInt(item.orders_count) || 0
          }));

          // Create weekly data (last 7 days from trend)
          const weeklyData = trendData.slice(-7).map(item => ({
            day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
            sales: parseFloat(item.revenue) || 0,
            orders: parseInt(item.orders_count) || 0
          }));

          // Calculate summary from sales data
          setSalesData({
            monthlyData,
            weeklyData,
            topProducts: salesData.topProducts,
            summary: {
              totalSales: parseFloat(data.sales?.total_revenue) || 0,
              totalOrders: parseInt(data.sales?.total_orders) || 0,
              newCustomers: parseInt(data.customers?.total) || 0
            }
          });
        } else {
          throw new Error(summaryResponse.data.message || t("seller.sales.errors.summary_failed"));
        }

        if (topProductsResponse.data.success) {
          const topProducts = topProductsResponse.data.data.map(product => ({
            id: product.id,
            name: product.name || t("seller.sales.unnamed_product"),
            sales: product.total_sold || 0,
            revenue: parseFloat(product.total_revenue) || 0
          }));
          
          setSalesData(prev => ({
            ...prev,
            topProducts
          }));
        } else {
          throw new Error(topProductsResponse.data.message || t("seller.sales.errors.top_products_failed"));
        }

      } catch (error) {
        console.error("Failed to fetch sales data:", error);
        setError(error.message || t("seller.sales.errors.load_failed"));
        setSalesData({
          monthlyData: [],
          weeklyData: [],
          topProducts: [],
          summary: {
            totalSales: 0,
            totalOrders: 0,
            newCustomers: 0
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [timeRange, refreshData]);

  const data = timeRange === "month" ? salesData.monthlyData : salesData.weeklyData;

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">{t("seller.sales.error_loading_data")}</h3>
          <p className="text-gray-600 dark:text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => refreshData?.()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            {t("seller.sales.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {t("seller.sales.sales_reports")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {t("seller.sales.sales_analytics_and_insights")}
          </p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <div className="relative">
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              className="block appearance-none w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="week">{t("seller.sales.this_week")}</option>
              <option value="month">{t("seller.sales.this_month")}</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
              <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          <div className="relative group">
            <button
              disabled={exporting}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exporting ? t("seller.sales.exporting") : t("seller.sales.export_label")}
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-gray-100 dark:border-slate-600 z-10 hidden group-hover:block">
              <button onClick={handleExportFull} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 rounded-t-lg">
                {t("seller.sales.full_report_xlsx")}
              </button>
              <button onClick={handleExportSalesTrend} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600">
                {t("seller.sales.sales_trend_only")}
              </button>
              <button onClick={handleExportTopProducts} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 rounded-b-lg">
                {t("seller.sales.top_products_only")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center">
            <div className="bg-blue-500 p-3 rounded-xl">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t("seller.sales.total_sales")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {fmtMMK(salesData.summary.totalSales)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {salesData.summary.totalSales > 0 ? "+0%" : "0%"} {t("seller.sales.increase")}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center">
            <div className="bg-purple-500 p-3 rounded-xl">
              <ShoppingBagIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {t("seller.sales.total_orders")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {salesData.summary.totalOrders}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {salesData.summary.totalOrders > 0 ? "+0%" : "0%"} {t("seller.sales.increase")}
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/30 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center">
            <div className="bg-yellow-500 p-3 rounded-xl">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                {t("seller.sales.new_customers")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {salesData.summary.newCustomers}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {salesData.summary.newCustomers > 0 ? "+0%" : "0%"} {t("seller.sales.increase")}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Overview Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            {t("seller.sales.sales_overview")}
          </h3>
          <div className="h-72">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey={timeRange === "month" ? "month" : "day"}
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '0.5rem',
                      color: '#f1f5f9'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#10B981"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    name={t("seller.sales.sales_amount")}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name={t("seller.sales.order_count")}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-slate-400">
                <ChartBarIcon className="h-12 w-12 mb-3" />
                <p>{t("seller.sales.no_sales_data")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue by Product Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            {t("seller.sales.revenue_by_product")}
          </h3>
          <div className="h-72">
            {salesData.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData.topProducts.slice(0, 5)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#9ca3af' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString()} ${t("common.currency.mmk", "MMK")}`, t("seller.sales.revenue")]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '0.5rem',
                      color: '#f1f5f9'
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    fill="#8B5CF6"
                    name={t("seller.sales.revenue")}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-slate-400">
                <ChartBarIcon className="h-12 w-12 mb-3" />
                <p>{t("seller.sales.no_product_data")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Selling Products Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {t("seller.sales.top_selling_products")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {t("seller.sales.best_performing_products")}
          </p>
        </div>

        <div className="overflow-x-auto">
          {salesData.topProducts.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("seller.sales.product")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("seller.sales.sold")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("seller.sales.revenue")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("seller.sales.performance")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("seller.sales.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {salesData.topProducts.slice(0, 5).map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-slate-600 dark:to-slate-500 rounded-lg flex items-center justify-center">
                          <ChartBarIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-slate-400">
                            {t("seller.sales.product_id", { id: product.id })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {product.sales}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">
                        {t("seller.sales.units")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {product.revenue.toLocaleString()} {t("common.currency.mmk", "MMK")}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">
                        {t("seller.sales.revenue_label")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.sales > 80
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : product.sales > 50
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300'
                        }`}>
                        {product.sales > 80 ? t("seller.sales.performance_high") : product.sales > 50 ? t("seller.sales.performance_medium") : t("seller.sales.performance_low")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 mr-4">
                        {t("seller.view")}
                      </button>
                      <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                        {t("seller.edit")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <ChartBarIcon className="h-12 w-12 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-slate-400">{t("seller.sales.no_products_found")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper icons
function LocalDownloadIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

export default function SalesReportsGated(props) {
  return (
    <PlanFeatureGate feature="analytics_enabled">
      <SalesReports {...props} />
    </PlanFeatureGate>
  );
}
