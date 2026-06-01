// src/components/admin/UserManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MagnifyingGlassIcon, FunnelIcon, TrashIcon, ShieldCheckIcon,
  CheckCircleIcon, XCircleIcon, ArrowPathIcon, UserCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  admin: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400",
  seller: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
  buyer: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
};

const RoleBadge = ({ role }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize
                    ${ROLE_COLORS[role] || "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"}`}>
    {role || "—"}
  </span>
);

const StatusBadge = ({ active }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                    ${active
      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
    {active
      ? <><CheckCircleIcon className="h-3 w-3" />Active</>
      : <><XCircleIcon className="h-3 w-3" />Inactive</>}
  </span>
);

// ── Inline toast ──────────────────────────────────────────────────────────────
const Toast = ({ toast }) => toast ? (
  <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium
    ${toast.type === "success"
      ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400"
      : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"}`}>
    {toast.type === "success"
      ? <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
      : <XCircleIcon className="h-4 w-4 flex-shrink-0" />}
    {toast.msg}
  </div>
) : null;

// ── Delete confirm modal ──────────────────────────────────────────────────────
const DeleteModal = ({ user, onConfirm, onClose }) => user ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-100 dark:border-slate-700">
      {/* Icon + title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
          <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="font-bold text-gray-900 dark:text-slate-100 text-base">Delete User</h3>
      </div>

      {/* ⚠️ Warning alert banner */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-3 mb-4">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">This action cannot be undone</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Deleting this account will permanently remove all associated data including orders, reviews, and profile information.
          </p>
        </div>
      </div>

      {/* Confirmation message */}
      <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
        Are you sure you want to delete <strong className="text-gray-900 dark:text-slate-200">{user.name}</strong>?
      </p>

      <div className="flex justify-end gap-3">
        <button onClick={onClose}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2">
          <TrashIcon className="h-4 w-4" />
          Delete User
        </button>
      </div>
    </div>
  </div>
) : null;

// ── Bulk confirm modal ────────────────────────────────────────────────────────
const BulkModal = ({ action, count, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-100 dark:border-slate-700">
      <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-2">Confirm Bulk Action</h3>

      {/* Warning banner for bulk delete */}
      {action === "delete" && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-3 mb-4">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Permanent deletion warning</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              All data for the selected users will be permanently removed and cannot be recovered.
            </p>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
        Are you sure you want to <strong className="text-gray-900 dark:text-slate-200">{action}</strong> {count} user(s)?
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm}
          className={`px-4 py-2 text-white text-sm font-semibold rounded-xl transition-colors
            ${action === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
          Confirm
        </button>
      </div>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const UserManagement = () => {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedUsers, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showBulkModal, setBulkModal] = useState(false);
  const toastTimer = useRef(null);

  const flash = (msg, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async (pg = page) => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: pg, per_page: 15,
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== "all" && { role: roleFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      };
      const res = await api.get("/users", { params });
      const payload = res.data.data;
      const items = Array.isArray(payload?.data) ? payload.data
        : Array.isArray(payload) ? payload : [];
      setUsers(items);
      const meta = res.data.meta || payload;
      setPagination({
        current_page: meta?.current_page ?? pg,
        last_page: meta?.last_page ?? 1,
        total: meta?.total ?? items.length,
        from: meta?.from ?? 1,
        to: meta?.to ?? items.length,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter, page]);

  useEffect(() => { fetchUsers(page); }, [searchTerm, roleFilter, statusFilter, page]);

  const deriveRole = (user) =>
    user.type ||
    (Array.isArray(user.roles) && user.roles.length > 0
      ? (typeof user.roles[0] === "string" ? user.roles[0] : user.roles[0]?.name)
      : null) ||
    "buyer";

  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.id === adminUser?.id && newRole !== "admin") {
      flash("You cannot change your own role.", "error"); return;
    }
    try {
      await api.post(`/users/${targetUser.id}/assign-roles`, { roles: [newRole] });
      setUsers(prev => prev.map(u =>
        u.id === targetUser.id ? { ...u, type: newRole, roles: [newRole] } : u
      ));
      flash(`Role updated to ${newRole}.`);
    } catch (err) {
      flash(err.response?.data?.message || "Failed to update role.", "error");
    }
  };

  const handleStatusChange = async (userId, isActive) => {
    try {
      await api.put(`/users/${userId}`, { is_active: isActive });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: isActive } : u));
      flash(`User ${isActive ? "activated" : "deactivated"}.`);
    } catch (err) {
      flash(err.response?.data?.message || "Failed to update status.", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setSelected(prev => prev.filter(id => id !== deleteTarget.id));
      flash(`${deleteTarget.name} deleted.`);
    } catch (err) {
      flash(err.response?.data?.message || "Failed to delete user.", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const executeBulk = async () => {
    setBulkModal(false);
    const actionableUsers = selectedUsers.filter(id => id !== adminUser?.id);

    if (actionableUsers.length !== selectedUsers.length) {
      flash("Your own account was skipped for safety.", "error");
    }

    if (actionableUsers.length === 0) {
      setSelected([]);
      setBulkAction("");
      return;
    }

    try {
      await Promise.all(actionableUsers.map(id => {
        if (bulkAction === "delete") return api.delete(`/users/${id}`);
        if (bulkAction === "activate") return api.put(`/users/${id}`, { is_active: true });
        if (bulkAction === "deactivate") return api.put(`/users/${id}`, { is_active: false });
        return Promise.resolve();
      }));
      flash(`${bulkAction} applied to ${actionableUsers.length} user(s).`);
      setSelected([]); setBulkAction(""); fetchUsers(page);
    } catch (err) {
      flash(err.response?.data?.message || `Bulk ${bulkAction} failed.`, "error");
    }
  };

  const toggleAll = () =>
    setSelected(prev => prev.length === users.filter(u => u.id !== adminUser?.id).length
      ? []
      : users.filter(u => u.id !== adminUser?.id).map(u => u.id));

  const inputCls = "w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent";
  const selectCls = "px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500";

  return (
    <div className="space-y-4">
      <Toast toast={toast} />
      <DeleteModal user={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
      {showBulkModal && (
        <BulkModal action={bulkAction} count={selectedUsers.length} onConfirm={executeBulk} onClose={() => setBulkModal(false)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">User Management</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {pagination?.total ? `${pagination.total} total users` : "Manage registered users"}
          </p>
        </div>
        <button onClick={() => fetchUsers(page)}
          className="p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowPathIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-green-800 dark:text-green-400">
            {selectedUsers.length} selected
          </span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
            className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-1 focus:ring-green-500">
            <option value="">Choose action…</option>
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="delete">Delete</option>
          </select>
          <button onClick={() => {
            if (!bulkAction) { flash("Please select an action.", "error"); return; }
            setBulkModal(true);
          }}
            className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
            Apply
          </button>
          <button onClick={() => setSelected([])}
            className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            Clear
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input value={searchTerm}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Name, email or phone…"
              className={inputCls} />
          </div>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className={selectCls}>
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="seller">Seller</option>
            <option value="buyer">Buyer</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className={selectCls}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {pagination && (
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400 dark:text-slate-500">
            <span>{pagination.total} users</span>
            {pagination.from && <><span>·</span><span>Showing {pagination.from}–{pagination.to}</span></>}
            <button onClick={() => { setSearch(""); setRoleFilter("all"); setStatus("all"); setPage(1); }}
              className="ml-auto flex items-center gap-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 text-xs transition-colors">
              <FunnelIcon className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 dark:text-red-400 text-sm">
            {error}
            <button onClick={() => fetchUsers(page)} className="ml-2 underline">Retry</button>
          </div>
        ) : users.length === 0 ? (
          <div className="py-14 text-center text-gray-400 dark:text-slate-500 text-sm">
            <UserCircleIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            {searchTerm || roleFilter !== "all" || statusFilter !== "all"
              ? "No users match your filters."
              : "No users yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox"
                      checked={selectedUsers.length === users.filter(u => u.id !== adminUser?.id).length && users.some(u => u.id !== adminUser?.id)}
                      onChange={toggleAll}
                      className="h-4 w-4 text-green-600 rounded border-gray-300 dark:border-slate-600 focus:ring-green-500" />
                  </th>
                  {["Name", "Email / Phone", "Role", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {users.map(u => {
                  const role = deriveRole(u);
                  const isMe = u.id === adminUser?.id;
                  return (
                    <tr key={u.id} className={`transition-colors ${isMe ? "bg-green-50/40 dark:bg-green-900/10" : "hover:bg-gray-50 dark:hover:bg-slate-700/50"}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          disabled={isMe}
                          onChange={() => setSelected(prev =>
                            prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                          )}
                          title={isMe ? "Cannot bulk-edit your own account" : "Select user"}
                          className="h-4 w-4 text-green-600 rounded border-gray-300 dark:border-slate-600 focus:ring-green-500 disabled:opacity-30 disabled:cursor-not-allowed" />
                      </td>

                      {/* Name + avatar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex-shrink-0 overflow-hidden">
                            {u.profile_photo && (
                              <img
                                loading="lazy"
                                src={u.profile_photo}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.classList.add("hidden");
                                  event.currentTarget.nextElementSibling?.classList.remove("hidden");
                                  event.currentTarget.nextElementSibling?.classList.add("flex");
                                }}
                              />
                            )}
                            <span className={`w-full h-full ${u.profile_photo ? "hidden" : "flex"} items-center justify-center text-xs font-bold text-gray-500 dark:text-slate-400`}>
                                {u.name?.[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-slate-100 flex items-center gap-1">
                              {u.name}
                              {isMe && <ShieldCheckIcon className="h-3.5 w-3.5 text-green-600" title="You" />}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500">{u.user_id || `#${u.id}`}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email / Phone */}
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                        <p className="truncate max-w-[180px]">{u.email || "—"}</p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500">{u.phone || "—"}</p>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <RoleBadge role={role} />
                          <select
                            value={role}
                            onChange={e => handleRoleChange(u, e.target.value)}
                            disabled={isMe}
                            title={isMe ? "Cannot change your own role" : "Change role"}
                            className="text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-1.5 py-0.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                                       focus:ring-1 focus:ring-green-400 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <option value="admin">Admin</option>
                            <option value="seller">Seller</option>
                            <option value="buyer">Buyer</option>
                          </select>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge active={u.is_active} />
                          <button
                            onClick={() => handleStatusChange(u.id, !u.is_active)}
                            disabled={isMe}
                            title={isMe ? "Cannot deactivate your own account" : u.is_active ? "Deactivate user" : "Activate user"}
                            className="text-[11px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 underline transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDeleteTarget(u)}
                          disabled={isMe}
                          title={isMe ? "Cannot delete yourself" : "Delete user"}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg
                                     transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pagination && pagination.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700 text-sm">
            <span className="text-gray-400 dark:text-slate-500 text-xs">
              Page {pagination.current_page} of {pagination.last_page}
            </span>
            <div className="flex gap-1">
              <button disabled={pagination.current_page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border border-gray-200 dark:border-slate-600 rounded-lg text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors">
                Previous
              </button>
              <button disabled={pagination.current_page === pagination.last_page}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border border-gray-200 dark:border-slate-600 rounded-lg text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
