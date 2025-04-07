import { Trans, t } from "@lingui/macro";
import { useEffect, useMemo, useState } from "react";

import { MAX_FEEDBACK_LENGTH } from "config/ui";
import { Answer, getQuestionsByRating, useNpsSurvey } from "domain/synthetics/userFeedback";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { Textarea } from "components/Textarea/Textarea";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function NpsModal() {
  const { isModalVisible, isSubmitting, onSubmitSurvey, rating, error } = useNpsSurvey();
  const [questions, setQuestions] = useState<Answer[]>([]);
  const [contact, setContact] = useState<string>("");

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
    if (answer.length > MAX_FEEDBACK_LENGTH) {
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
      setContact("");
    },
    [rating]
  );

  return (
    <Modal
      isVisible={isModalVisible}
      setIsVisible={() => onSubmitSurvey({ answers: questions, contact })}
      label={t`Help us improve`}
    >
      <div className="max-w-xl">
        {questions.map((question, index) => (
          <div key={question.questionType} className="mb-15">
            {question.question}
            <Textarea
              value={question.answer}
              onChange={(val) => onChangeAnswer(index, val)}
              placeholder={t`Enter your answer here`}
            />
          </div>
        ))}

        <div className="mb-15 flex flex-col">
          <TooltipWithPortal
            position="top-start"
            content={<Trans>Leave your Telegram if you’re okay with being contacted for a quick follow-up</Trans>}
          >
            <Trans>Telegram contact (optional)</Trans>
          </TooltipWithPortal>
          <input
            className="mt-15 text-input-bg"
            name="contact"
            type="text"
            value={contact}
            onChange={(evt) => setContact(evt.target.value)}
            placeholder={t`@username`}
          />
        </div>
      </div>
      <Button
        variant="primary-action"
        className="mt-4 w-full"
        onClick={() => onSubmitSurvey({ answers: questions, contact })}
        disabled={submitButtonState.disabled}
      >
        {submitButtonState.text}
      </Button>
    </Modal>
  );
}
