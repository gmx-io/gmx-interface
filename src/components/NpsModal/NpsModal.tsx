import { Answer, getQuestionsByRating, useNpsSurvey } from "@/domain/synthetics/userFeedback";
import { t } from "@lingui/macro";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { Textarea } from "components/Textarea/Textarea";
import { useEffect, useMemo, useState } from "react";

const MAX_ANSWER_LENGTH = 500;

export function NpsModal() {
  const { isModalVisible, isSubmitting, onSubmitSurvey, rating, error } = useNpsSurvey();
  const [questions, setQuestions] = useState<Answer[]>([]);

  const submitButtonState = useMemo(() => {
    if (isSubmitting) {
      return {
        text: t`Submitting...`,
        disabled: true,
      };
    }

    if (error) {
      return {
        text: t`Error occurred. Please try again`,
        disabled: true,
      };
    }

    return {
      text: t`Submit`,
      disabled: false,
    };
  }, [error, isSubmitting]);

  function onChangeAnswer(index: number, answer: string) {
    if (answer.length > MAX_ANSWER_LENGTH) {
      return;
    }

    setQuestions((questions) => {
      questions[index].answer = answer;
      return [...questions];
    });
  }

  useEffect(
    function initQuestionsEff() {
      if (!rating) {
        return;
      }

      const initialQuestions = getQuestionsByRating(rating).map((question) => ({
        questionType: question.questionType,
        question: question.question,
        answer: "",
      }));
      setQuestions(initialQuestions);
    },
    [rating]
  );

  return (
    <Modal isVisible={isModalVisible} setIsVisible={() => onSubmitSurvey(questions)} label={t`Anonymous chat with GMX`}>
      <div className="max-w-xl">
        {questions.map((question, index) => (
          <div key={question.questionType} className="mb-15">
            {question.question}
            <Textarea value={question.answer} onChange={(val) => onChangeAnswer(index, val)} />
          </div>
        ))}
      </div>
      <Button
        variant="primary-action"
        className="mt-4 w-full"
        onClick={() => onSubmitSurvey(questions)}
        disabled={submitButtonState.disabled}
      >
        {submitButtonState.text}
      </Button>
    </Modal>
  );
}
