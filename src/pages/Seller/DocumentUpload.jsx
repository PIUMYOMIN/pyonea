// pages/Seller/DocumentUpload.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DocumentIcon,
    CheckCircleIcon,
    CloudArrowUpIcon,
    TrashIcon,
    EyeIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    DocumentCheckIcon
} from '@heroicons/react/24/outline';
import OnboardingLayout from '../../components/OnboardingLayout';
import { useOnboardingState } from '../../hooks/useOnboardingState';


const DocumentUpload = () => {
    const navigate = useNavigate();
    const { saveStep, isLoading, businessTypeInfo, uploadedDocs, documentRequirements, uploadDocument, deleteDocument } = useOnboardingState();
    const [uploading, setUploading] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [documentsComplete, setDocumentsComplete] = useState(false);

    // requirements come from the hook's init() call — no extra fetch needed
    const requirements = documentRequirements;

    useEffect(() => {
        checkDocumentsComplete();
    }, [uploadedDocs, requirements]);

    const checkDocumentsComplete = () => {
        const requiredDocs = requirements.filter(req => req.required);
        const allRequiredUploaded = requiredDocs.every(req =>
            uploadedDocs[req.type]?.uploaded
        );
        setDocumentsComplete(allRequiredUploaded);
    };

    const handleFileUpload = async (field, file, requirement) => {
        if (!file) return;

        const validExtensions = requirement.accepted_formats?.split(',') || ['jpg', 'jpeg', 'png', 'pdf'];
        const fileExt = file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            setError(`Invalid file type. Accepted: ${validExtensions.join(', ')}`);
            return;
        }

        const maxSize = requirement.max_size?.includes('5MB') ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
        if (file.size > maxSize) {
            setError(`File too large. Max size: ${requirement.max_size || '2MB'}`);
            return;
        }

        setUploading({ ...uploading, [field]: true });
        setError('');
        setSuccess('');

        const result = await uploadDocument(file, field);

        if (result.success) {
            setSuccess(`${requirement.label} uploaded successfully!`);
            setTimeout(() => setSuccess(""), 3000);
        } else {
            setError(result.message || 'Failed to upload document');
        }

        setUploading({ ...uploading, [field]: false });
    };

    const handleRemoveDocument = async (field) => {
        const result = await deleteDocument(field);

        if (result.success) {
            setSuccess('Document removed successfully');
            setTimeout(() => setSuccess(""), 3000);
        } else {
            setError(result.message || 'Failed to remove document');
        }
    };

    const handleViewDocument = (url) => {
        if (url) {
            window.open(url, '_blank');
        }
    };

    const handleContinue = async () => {
        setError('');

        const missing = [];
        requirements.forEach(req => {
            if (req.required && !uploadedDocs[req.type]?.uploaded) {
                missing.push(req.label);
            }
        });

        if (missing.length > 0) {
            setError(`Please upload required documents: ${missing.join(', ')}`);
            return;
        }

        const result = await saveStep('documents', {});

        if (result.success) {
            navigate(`/seller/onboarding/review-submit`);
        } else {
            setError(result.message || "Failed to save document status");
        }
    };

    const getDocumentStatus = () => {
        const requiredDocs = requirements.filter(req => req.required);
        const uploadedRequired = requiredDocs.filter(
            req => uploadedDocs[req.type]?.uploaded
        ).length;

        return `${uploadedRequired}/${requiredDocs.length} required documents uploaded`;
    };

    return (
        <OnboardingLayout
            title="Document Verification"
            description="Upload required documents for verification"
            onBack={() => navigate('/seller/onboarding/delivery-zones')}
            onNext={handleContinue}
            nextLabel="Continue to Review"
            nextDisabled={isLoading || !documentsComplete}
            loading={isLoading}
        >
            <div className="p-6">
                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <div className="flex justify-between items-start">
                            <div className="flex">
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 dark:hover:text-red-300">
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                        <div className="flex justify-between items-start">
                            <div className="flex">
                                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                                <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
                            </div>
                            <button onClick={() => setSuccess("")} className="text-green-500 hover:text-green-700 dark:hover:text-green-300">
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Business Type Info */}
                    {businessTypeInfo && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                            <div className="flex items-start">
                                <InformationCircleIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                                <div>
                                    <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-1">Business Type: {businessTypeInfo.name}</h3>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        {businessTypeInfo.is_individual
                                            ? "As an individual seller, you need to upload identity documents."
                                            : "As a business seller, you need to upload business registration, tax, and identity documents."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progress Status */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <DocumentCheckIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2" />
                                <span className="font-medium text-yellow-900 dark:text-yellow-200">Document Status</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                documentsComplete
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            }`}>
                                {getDocumentStatus()}
                            </span>
                        </div>
                        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                            <p>• All documents must be clear and readable</p>
                            <p>• Accepted formats: PDF, JPG, JPEG, PNG</p>
                            <p>• Files should not exceed 5MB (2MB for images)</p>
                        </div>
                    </div>

                    {/* Document Upload Sections */}
                    {requirements.map((requirement) => (
                        <div key={requirement.type} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                            {requirement.label}
                                            {requirement.required && <span className="text-red-500 ml-1">*</span>}
                                        </h3>
                                        {uploadedDocs[requirement.type]?.uploaded && (
                                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{requirement.description}</p>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        <div>
                                            <span className="font-medium">Accepted formats:</span> {requirement.accepted_formats || 'jpg, jpeg, png, pdf'}
                                        </div>
                                        <div>
                                            <span className="font-medium">Max file size:</span> {requirement.max_size || '2MB'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-4">
                                    {requirement.required ? 'Required' : 'Optional'}
                                </div>
                            </div>

                            {uploadedDocs[requirement.type]?.uploaded ? (
                                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center space-x-3">
                                        <DocumentIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                Document uploaded
                                            </p>
                                            <div className="flex space-x-3 mt-1">
                                                <button
                                                    onClick={() => handleViewDocument(uploadedDocs[requirement.type].url)}
                                                    className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center"
                                                >
                                                    <EyeIcon className="h-4 w-4 inline mr-1" />
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveDocument(requirement.type)}
                                        className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Remove document"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="file"
                                        id={`file-${requirement.type}`}
                                        accept={requirement.accepted_formats || '.pdf,.jpg,.jpeg,.png'}
                                        onChange={(e) => handleFileUpload(requirement.type, e.target.files[0], requirement)}
                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                        disabled={uploading[requirement.type]}
                                    />
                                    <label
                                        htmlFor={`file-${requirement.type}`}
                                        className={`flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                                            uploading[requirement.type]
                                                ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/10'
                                        }`}
                                    >
                                        {uploading[requirement.type] ? (
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-3"></div>
                                                <span className="text-sm text-blue-600 dark:text-blue-400">Uploading...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload {requirement.label}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    {requirement.accepted_formats || 'PDF, JPG, JPEG, PNG'} • Max {requirement.max_size || '2MB'}
                                                </span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default DocumentUpload;