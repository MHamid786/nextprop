import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, RefreshCw, Phone, MoreVertical, AlertCircle, Send, CheckCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import Avatar from "./Avatar";

export default function MessageThread({ activeConversation, onSendMessage, messages, onLoadMore, hasMore, loading }: any) {
    const [newMessage, setNewMessage] = useState('');
    const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuth();

    // Helper function to get initials from name
    const getInitials = (name: string) => {
        if (!name) return 'U';
        return name.split(' ')
            .filter((n: string) => n.length > 0)
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // Scroll to bottom when messages change, but only for new messages
    useEffect(() => {
        if (messagesEndRef.current && !loading) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading]);

    // Scroll to bottom immediately when sending status changes to make sure user sees their sent message
    useEffect(() => {
        if (sendingStatus === 'sending' && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [sendingStatus]);

    const handleSend = () => {
        if (newMessage.trim()) {
            setSendingStatus('sending');
            onSendMessage(newMessage, (success: boolean) => {
                setSendingStatus(success ? 'success' : 'error');
                setTimeout(() => setSendingStatus('idle'), 3000);
            });
            setNewMessage('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleRefresh = () => {
        if (activeConversation && !refreshing) {
            setRefreshing(true);
            onLoadMore(true); // Pass true to indicate it's a refresh
            setTimeout(() => setRefreshing(false), 1000);
        }
    };

    const handleCall = async () => {

        if (!user?.lcPhone?.locationId) {
            /// show alert that you dont have any active phone number yet
            toast.error('You dont have any active phone number yet');
        }
        const response = await fetch(`/api/conversations/messages/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'call',
                contactId: activeConversation.contactId,
                conversationId: activeConversation.id,
                conversationProviderId: 'twilio_provider',
                date: new Date().toISOString(),
                // TODO: need to figure out, from where can get the to/from phone numbers
                call: {
                    to: "+15037081210",
                    from: user?.phone,
                    status: "completed"
                }
            }),
        });
        const data = await response.json();
    }

    // If no active conversation is selected
    if (!activeConversation) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-gray-500 p-8">
                <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
                    <p>Please select a conversation from the list to view messages.</p>
                </div>
            </div>
        );
    }

    // Render skeleton loading state for messages
    const renderSkeletonLoader = () => {
        return (
            <div className="animate-pulse space-y-4 py-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} mb-4`}>
                        <div
                            className={`max-w-[65%] rounded-lg px-4 py-2 ${i % 2 === 0 ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-900'
                                }`}
                        >
                            <div className="h-4 w-24 bg-gray-300 rounded mb-2"></div>
                            <div className="h-3 w-12 bg-gray-300 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b border-gray-200 p-3 sticky top-0 z-10 bg-white">
                <div className="flex items-center">
                    <div className="md:hidden mr-2">
                        <button className="p-2 rounded-md hover:bg-gray-100">
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                    <Avatar initials={getInitials(activeConversation.name)} />
                    <div className="ml-3 flex-grow">
                        <h2 className="font-medium">{activeConversation.name || 'Unknown Contact'}</h2>
                        <div className="flex items-center text-sm text-gray-500">
                            {activeConversation.phone && (
                                <span className="mr-2">{activeConversation.phone}</span>
                            )}
                            {activeConversation.email && (
                                <span>{activeConversation.email}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex">
                        <button
                            className="p-2 rounded-full hover:bg-gray-100 mr-1"
                            onClick={handleRefresh}
                            disabled={loading || refreshing}
                        >
                            <div className={`${refreshing ? 'animate-spin' : ''}`}>
                                <RefreshCw size={20} className="text-gray-600" />
                            </div>
                        </button>
                        <button
                            className="p-2 rounded-full hover:bg-gray-100 mr-1"
                            onClick={handleCall}
                        >
                            <Phone size={20} className="text-gray-600" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-gray-100">
                            <MoreVertical size={20} className="text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4">
                {hasMore && (
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={onLoadMore}
                            className="bg-white text-purple-600 px-4 py-2 rounded-full border border-blue-300 text-sm font-medium hover:bg-blue-50 transition-colors"
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Load earlier messages'}
                        </button>
                    </div>
                )}

                {loading && messages.length === 0 ? (
                    renderSkeletonLoader()
                ) : messages && messages.length > 0 ? (
                    messages.map((message: any) => (
                        <div
                            key={message.id}
                            className={`flex ${message.senderId === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                        >
                            <div
                                className={`max-w-[85%] rounded-lg px-4 py-2 ${message.senderId === 'user'
                                        ? message.sendFailed ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-purple-600 text-white'
                                        : 'bg-gray-200 text-gray-900'
                                    }`}
                            >
                                <p className="break-words whitespace-pre-wrap text-sm">{message.text}</p>
                                <div
                                    className={`text-xs mt-1 flex items-center ${message.senderId === 'user'
                                            ? message.sendFailed ? 'text-red-500' : 'text-blue-100'
                                            : 'text-gray-500'
                                        }`}
                                >
                                    {message.timestamp}
                                    {message.sendFailed && (
                                        <span className="ml-2 text-red-500 flex items-center">
                                            <AlertCircle size={12} className="mr-1" /> Failed to send
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col h-full items-center justify-center text-gray-500">
                        <div className="text-center p-4">
                            {loading ? (
                                <p>Loading messages...</p>
                            ) : activeConversation ? (
                                <p>No messages in this conversation yet. Send a message to start the conversation.</p>
                            ) : (
                                <p>Select a conversation to view messages.</p>
                            )}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-3 bg-white">
                <div className="flex items-end">
                    <textarea
                        className="flex-grow border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[80px] max-h-[160px]"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={sendingStatus === 'sending'}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sendingStatus === 'sending'}
                        className={`ml-2 p-3 rounded-full flex items-center justify-center ${!newMessage.trim() || sendingStatus === 'sending'
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {sendingStatus === 'sending' ? (
                            <div className="w-5 h-5 border-2 border-t-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Send size={18} className={!newMessage.trim() ? 'text-gray-400' : 'text-white'} />
                        )}
                    </button>
                </div>

                {/* Message Status */}
                {sendingStatus === 'success' && (
                    <div className="mt-1 text-xs text-green-600 flex items-center">
                        <CheckCircle size={12} className="mr-1" /> Message sent successfully
                    </div>
                )}
                {sendingStatus === 'error' && (
                    <div className="mt-1 text-xs text-red-600 flex items-center">
                        <AlertCircle size={12} className="mr-1" /> Failed to send message. Please try again.
                    </div>
                )}
            </div>
        </div>
    );
}
