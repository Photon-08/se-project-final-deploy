from openai import OpenAI
import re


def analyze_sentiment(feedback_list):
    feedback_str = ", ".join(feedback_list)
    
    prompt = f"""
    Analyze the sentiment of the following feedback and classify the overall sentiment as one of the three categories: Negative, Mixed, or Positive. 
    Consider all feedback collectively and determine the overall sentiment based on the balance of opinions.

    Example:
    Feedback: The course was engaging and well-structured!, Some topics were unclear and needed better explanation.
    sentiment: Mixed

    Now analyze the following feedback: {feedback_str}
    Provide the sentiment in the same format as the example above.
    """

    client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="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"
    )


    completion = client.chat.completions.create(
        model="google/gemini-2.0-flash-lite-001",
        messages=[{"role": "user", "content": prompt}]
    )

    output = completion.choices[0].message.content
    pattern = r"sentiment:\s*(Positive|Mixed|Negative)"

    match = re.search(pattern, output, re.IGNORECASE)
    return match.group(1) if match else "Sentiment not found"