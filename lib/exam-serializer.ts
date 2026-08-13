type ExamRecord = Record<string, any>;

export function toPublicExam(exam: ExamRecord): ExamRecord {
    const { adminPin, accessCode, subjects, ...rest } = exam;

    return {
        ...rest,
        hasAccessCode: !!(accessCode || '').toString().trim(),
        subjects: (subjects || []).map((subject: ExamRecord) => {
            const { pin, ...subjectRest } = subject;
            return {
                ...subjectRest,
                hasPin: !!(pin || '').toString().trim(),
            };
        }),
    };
}
