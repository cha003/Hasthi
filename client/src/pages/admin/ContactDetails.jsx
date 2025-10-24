import { useEffect, useState } from "react";
import axios from "axios";
import { 
  Mail, 
  User, 
  MessageSquare, 
  Eye, 
  Filter,
  Search,
  RefreshCw,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle
} from "lucide-react";

// Status badge component
function StatusBadge({ status }) {
  const statusConfig = {
    new: {
      bg: "bg-gradient-to-r from-amber-100 to-yellow-100",
      text: "text-amber-800",
      border: "border-amber-200",
      icon: AlertCircle,
      label: "New"
    }
  };

  const config = statusConfig[status] || statusConfig.new;
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      <IconComponent className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
}

// Message card component for better mobile experience
function MessageCard({ message, onView, onMarkResolved }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{message.name}</h3>
            <p className="text-sm text-gray-500 flex items-center">
              <Mail className="w-3 h-3 mr-1" />
              {message.email}
            </p>
          </div>
        </div>
        <StatusBadge status={message.status} />
      </div>

      <div className="mb-4">
        <div className="flex items-center mb-2">
          <MessageSquare className="w-4 h-4 text-emerald-600 mr-2" />
          <span className="font-medium text-gray-900">{message.subject}</span>
        </div>
        {message.message && (
          <p className="text-sm text-gray-600 line-clamp-2">{message.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="w-3 h-3 mr-1" />
          {new Date(message.createdAt || Date.now()).toLocaleDateString()}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onView(message._id)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </button>
          {message.status === 'new' && (
            <button
              onClick={() => onMarkResolved(message._id)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal component for showing full message details
function MessageModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-8 w-1/2">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-semibold">{message.subject}</h3>
          <button
            onClick={onClose}
            className="text-emerald-600 hover:text-emerald-800"
          >
            X
          </button>
        </div>

        <div className="mb-4">
          <div className="text-lg font-medium text-gray-900 mb-2">{message.name}</div>
          <p className="text-sm text-gray-500 flex items-center mb-2">
            <Mail className="w-3 h-3 mr-1" />
            {message.email}
          </p>
          <p className="text-sm text-gray-600">{message.message}</p>
        </div>

        <div className="flex items-center justify-between">
          <StatusBadge status={message.status} />
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactDetails() {
  const [contactMessages, setContactMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("cards"); // cards or table
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    async function fetchContactMessages() {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:5000/api/contact");
        setContactMessages(response.data.data);
        setFilteredMessages(response.data.data);
      } catch (error) {
        setError("Error fetching contact messages");
        console.error("Error fetching contact messages:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchContactMessages();
  }, []);

  // Filter messages based on search and status
  useEffect(() => {
    let filtered = contactMessages;

    if (searchTerm) {
      filtered = filtered.filter(msg =>
        msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(msg => msg.status === statusFilter);
    }

    setFilteredMessages(filtered);
  }, [contactMessages, searchTerm, statusFilter]);

  const handleMarkAsResolved = async (messageId) => {
    try {
      await axios.put(`http://localhost:5000/api/contact/${messageId}`, { status: 'resolved' });
      setContactMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === messageId ? { ...msg, status: 'resolved' } : msg
        )
      );
    } catch (error) {
      console.error("Error updating message status:", error);
      setError("Failed to mark message as resolved");
    }
  };

  const handleViewMessage = (id) => {
    const message = contactMessages.find(msg => msg._id === id);
    setSelectedMessage(message);
  };

  const handleCloseModal = () => {
    setSelectedMessage(null);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const stats = {
    total: contactMessages.length,
    new: contactMessages.filter(msg => msg.status === 'new').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contact messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-emerald-100">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-amber-100">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New</p>
              <p className="text-2xl font-bold text-gray-900">{stats.new}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and controls */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* View mode toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === "cards"
                    ? "bg-emerald-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-emerald-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </p>
        </div>
      )}

      {/* Content */}
      {filteredMessages.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "No contact messages to display at this time."}
          </p>
        </div>
      ) : (
        <>
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredMessages.map((message) => (
                <MessageCard
                  key={message._id}
                  message={message}
                  onView={handleViewMessage}
                  onMarkResolved={handleMarkAsResolved}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-emerald-50 to-teal-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMessages.map((message) => (
                      <tr key={message._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center mr-3">
                              <User className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{message.name}</div>
                              <div className="text-sm text-gray-500">{message.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">{message.subject}</div>
                          {message.message && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {message.message}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={message.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(message.createdAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewMessage(message._id)}
                              className="text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              View
                            </button>
                            {message.status === 'new' && (
                              <button
                                onClick={() => handleMarkAsResolved(message._id)}
                                className="text-teal-600 hover:text-teal-700 font-medium"
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {selectedMessage && (
        <MessageModal message={selectedMessage} onClose={handleCloseModal} />
      )}
    </div>
  );
}
