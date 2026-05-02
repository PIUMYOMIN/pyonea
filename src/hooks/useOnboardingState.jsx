// hooks/useOnboardingState.js
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

export const useOnboardingState = () => {
    const [currentStep, setCurrentStep]       = useState('store-basic');
    const [formData, setFormData]             = useState({});
    const [progress, setProgress]             = useState(0);
    const [isLoading, setIsLoading]           = useState(false);
    const [businessTypeInfo, setBusinessTypeInfo] = useState(null);
    const [uploadedDocs, setUploadedDocs]     = useState({});
    const [documentRequirements, setDocumentRequirements] = useState([]);

    // Prevent concurrent initialisations on React strict-mode double-mount
    const initStarted = useRef(false);

    const steps = [
        { id: 'store-basic',      title: 'Store Basic',      icon: '🏪' },
        { id: 'business-details', title: 'Business Details', icon: '📄' },
        { id: 'address',          title: 'Address',          icon: '📍' },
        { id: 'delivery-zones',   title: 'Delivery Zones',   icon: '🚚' },
        { id: 'documents',        title: 'Documents',        icon: '📎' },
        { id: 'review-submit',    title: 'Review',           icon: '✅' },
    ];

    // ── Initialise — single consolidated load call ────────────────────────
    // FIX: the original fired 3 separate API calls on every component mount
    // (loadOnboardingData, loadOnboardingStatus, loadDocumentRequirements).
    // All 5 step pages mount fresh, so that was 15 calls per onboarding session.
    // Combined into one init() that:
    //   1. Calls POST /seller/init-profile (idempotent — creates shell if missing)
    //   2. Calls GET /seller/onboarding/data for pre-fill data
    //   3. Calls GET /seller/onboarding/status for step/progress/businessTypeInfo
    //   4. Calls GET /seller/document-requirements for uploaded docs
    const init = useCallback(async () => {
        if (initStarted.current) return;
        initStarted.current = true;

        try {
            setIsLoading(true);

            // 1. Ensure a shell profile exists — safe to call even if it already exists
            await api.post('/seller/init-profile').catch(() => {
                // If this fails (e.g. 409 already exists) that's fine — continue
            });

            // 2-4. Fire remaining calls in parallel
            const [dataRes, statusRes, docsRes] = await Promise.allSettled([
                api.get('/seller/onboarding/data'),
                api.get('/seller/onboarding/status'),
                api.get('/seller/document-requirements'),
            ]);

            if (dataRes.status === 'fulfilled' && dataRes.value.data.success) {
                setFormData(dataRes.value.data.data);
            }

            if (statusRes.status === 'fulfilled' && statusRes.value.data.success) {
                const { data } = statusRes.value.data;
                setCurrentStep(data.current_step || 'store-basic');
                setProgress(data.progress_percentage ?? data.progress ?? 0);

                // FIX: was reading data.business_type_info but getOnboardingStatus()
                // never returned that field — now it does (after backend fix)
                if (data.business_type_info) {
                    setBusinessTypeInfo(data.business_type_info);
                }
            }

            if (docsRes.status === 'fulfilled' && docsRes.value.data.success) {
                const docsData = docsRes.value.data.data;
                setUploadedDocs(docsData?.uploaded_documents || {});
                setDocumentRequirements(docsData?.requirements || []);
            }

        } catch (error) {
            console.error('Onboarding init failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Save step ─────────────────────────────────────────────────────────
    const saveStep = async (step, data) => {
        try {
            setIsLoading(true);

            const endpoints = {
                'store-basic':      '/seller/onboarding/store-basic',
                'business-details': '/seller/onboarding/business-details',
                'address':          '/seller/onboarding/address',
                'documents':        '/seller/onboarding/mark-documents-complete',
                'review-submit':    '/seller/onboarding/submit',
            };

            const endpoint = endpoints[step];
            if (!endpoint) throw new Error(`No endpoint for step: ${step}`);

            const response = await api.post(endpoint, data);

            if (response.data.success) {
                setFormData(prev => ({ ...prev, ...data }));

                // FIX: prefer nextStep from backend response; fall back to hardcoded map
                const backendNextStep = response.data.data?.next_step ?? response.data.next_step;
                const fallbackMap = {
                    'store-basic':      'business-details',
                    'business-details': 'address',
                    'address':          'documents',
                    'documents':        'review-submit',
                    'review-submit':     'complete',
                };

                return {
                    success:  true,
                    nextStep: backendNextStep ?? fallbackMap[step] ?? 'store-basic',
                    data:     response.data.data,
                };
            }

            return {
                success: false,
                errors:  response.data.errors,
                message: response.data.message,
            };

        } catch (error) {
            console.error('Save step failed:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to save',
                errors:  error.response?.data?.errors,
            };
        } finally {
            setIsLoading(false);
        }
    };

    // ── Document helpers ──────────────────────────────────────────────────
    const uploadDocument = async (file, documentType) => {
        const fd = new FormData();
        fd.append('document_type', documentType);
        fd.append('document', file);

        try {
            const response = await api.post('/seller/onboarding/documents', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                setUploadedDocs(prev => ({
                    ...prev,
                    [documentType]: { uploaded: true, url: response.data.data.url },
                }));
                return { success: true, url: response.data.data.url };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Upload failed' };
        }
    };

    const deleteDocument = async (documentType) => {
        try {
            const response = await api.delete(`/seller/documents/${documentType}`);
            if (response.data.success) {
                setUploadedDocs(prev => {
                    const updated = { ...prev };
                    delete updated[documentType];
                    return updated;
                });
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Delete failed' };
        }
    };

    const loadDocumentRequirements = useCallback(async () => {
        try {
            const response = await api.get('/seller/document-requirements');
            if (response.data.success) {
                setUploadedDocs(response.data.data.uploaded_documents || {});
            }
        } catch (error) {
            console.error('Failed to load document requirements:', error);
        }
    }, []);

    const loadOnboardingStatus = useCallback(async () => {
        try {
            const response = await api.get('/seller/onboarding/status');
            if (response.data.success) {
                const { data } = response.data;
                setCurrentStep(data.current_step || 'store-basic');
                setProgress(data.progress_percentage ?? data.progress ?? 0);
                if (data.business_type_info) {
                    setBusinessTypeInfo(data.business_type_info);
                }
            }
        } catch (error) {
            console.error('Failed to load onboarding status:', error);
        }
    }, []);

    useEffect(() => {
        init();
    }, [init]);

    return {
        currentStep,
        setCurrentStep,
        formData,
        setFormData,
        progress,
        steps,
        isLoading,
        businessTypeInfo,
        uploadedDocs,
        documentRequirements,
        saveStep,
        uploadDocument,
        deleteDocument,
        loadDocumentRequirements,
        loadOnboardingStatus,
    };
};