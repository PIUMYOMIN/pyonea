// components/StepGuard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { resolveSellerOnboardingStep } from '../utils/sellerOnboarding';

let _statusCache = null;
let _statusCacheTime = 0;
const CACHE_TTL_MS = 10_000;
export const invalidateOnboardingCache = () => {
    _statusCache = null;
    _statusCacheTime = 0;
};

const StepGuard = ({ children, step }) => {
    const [isValid, setIsValid]   = useState(false);
    const [loading, setLoading]   = useState(true);
    const navigate                = useNavigate();
    const { user, loading: authLoading, hasRole } = useAuth();
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setIsValid(false);

        const validateStep = async () => {
            if (authLoading) {
                return;
            }

            if (!user) {
                navigate('/login');
                return;
            }

            if (!hasRole('seller')) {
                navigate('/');
                return;
            }

            // Accounts with an email must verify it (phone-only users have no email)
            if (user.email && !user.email_verified_at) {
                navigate('/verify-email', {
                    state: { returnTo: `/seller/onboarding/${step}` }
                });
                return;
            }

            try {
                let statusData;

                // Use cached status if fresh enough — avoids one API call per step page
                const now = Date.now();
                if (_statusCache && now - _statusCacheTime < CACHE_TTL_MS) {
                    statusData = _statusCache;
                } else {
                    const response = await api.get('/seller/onboarding/status');
                    if (cancelled) return;
                    if (response.data.success) {
                        _statusCache = response.data.data;
                        _statusCacheTime = now;
                        statusData = _statusCache;
                    }
                }

                if (cancelled) return;

                if (!statusData) {
                    navigate('/seller/onboarding/store-basic');
                    return;
                }

                // Onboarding already complete — send to dashboard
                if (statusData.onboarding_complete && !statusData.needs_onboarding) {
                    navigate('/seller/dashboard');
                    return;
                }

                // 3-step flow: only store-basic is an onboarding page
                const stepOrder = [
                    'store-basic',
                ];

                const resolvedStep = await resolveSellerOnboardingStep(statusData);
                if (cancelled) return;
                const currentIndex   = stepOrder.indexOf(resolvedStep);
                const requestedIndex = stepOrder.indexOf(step);

                if (requestedIndex < 0) {
                    navigate('/seller/onboarding/store-basic');
                } else if (requestedIndex > currentIndex) {
                    // FIX: was silently redirecting — now preserves the current step
                    navigate(`/seller/onboarding/${resolvedStep || 'store-basic'}`);
                } else {
                    setIsValid(true);
                }

            } catch (error) {
                console.error('Step validation failed:', error);
                navigate('/seller/onboarding/store-basic');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        validateStep();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, step, hasRole]); // navigate is stable; auth + step are the meaningful deps

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-slate-400 text-sm">Validating step...</p>
                </div>
            </div>
        );
    }

    return isValid ? children : null;
};

export default StepGuard;
